import {
  Button,
  Divider,
  Input,
  InputRef,
  Select,
  Space,
  Table,
  TableProps,
} from "antd";
import { DamageSource, Log, Skill } from "../../worker/read-log/types";
import { useEffect, useRef, useState } from "react";
import { bosses, NORMAL_ATTACK } from "../../worker/read-log/constant";
import SkillModal, { SkillModalProps } from "./skill-modal";
import { SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";

interface DataType {
  key: string;
  damageSource: string;
  role?: string;
  race?: string;
  damageCount: number;
  dps: number;
  criticalRate: number;
}

interface IProps {
  logList: Log[];
  skillMap: Map<string, Skill>;
  damageSourceMap: Map<string, DamageSource>;
}

function DamageMeter({ logList, skillMap }: IProps) {
  // 表格数据
  const [dataSource, setDataSource] = useState<DataType[]>([]);
  // const [sourceList, setSourceList] = useState<string[]>([]);
  // 筛选的伤害目标
  const [targetList, setTargetList] = useState<string[]>([]);
  // 技能弹窗
  const [skillModalProps, setSkillModalProps] = useState<
    Partial<SkillModalProps>
  >({
    open: false,
    sourceName: "",
  });

  //伤害来源的搜索词
  const [sourceSearchText, setSourceSearchText] = useState<string>("");
  // 已经筛选的列
  const [filteredColumns, seFilteredColumns] = useState<(keyof DataType)[]>([]);

  const hasInitalized = useRef(false);
  // const allSources = useRef<string[]>([]);
  const allTargets = useRef<string[]>([]);
  const searchInput = useRef<InputRef>(null);
  // 数据筛选

  useEffect(() => {
    if (!hasInitalized.current && logList.length > 0) {
      conditionalAnalyze();
      hasInitalized.current = true;
    }

    return () => {
      hasInitalized.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logList]);

  const columns: TableProps<DataType>["columns"] = [
    {
      title: "伤害源",
      dataIndex: "damageSource",
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
      ),
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            ref={searchInput}
            placeholder={`多个关键字用逗号分隔`}
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => {
              confirm();
              setSourceSearchText(selectedKeys[0] as string);
              seFilteredColumns(
                filteredColumns.includes("damageSource")
                  ? [...filteredColumns]
                  : [...filteredColumns, "damageSource"]
              );
            }}
            style={{ marginBottom: 8, display: "block" }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                confirm();
                setSourceSearchText(selectedKeys[0] as string);
                seFilteredColumns(
                  filteredColumns.includes("damageSource")
                    ? [...filteredColumns]
                    : [...filteredColumns, "damageSource"]
                );
              }}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              搜索
            </Button>
            <Button
              onClick={() => {
                clearFilters?.();
                setSourceSearchText("");
                seFilteredColumns(
                  filteredColumns.filter((c) => c !== "damageSource")
                );
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              重置
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) => {
        // 将value转换为数组，分隔符可以是中英文的任意逗号
        const valList = value.toString().split(/,|，/);
        const sourceStr = record.damageSource.toString().toLowerCase();
        return valList.some((v) => sourceStr.includes(v.toLowerCase()));
      },
      filterDropdownProps: {
        onOpenChange(open) {
          if (open) {
            setTimeout(() => searchInput.current?.select(), 100);
          }
        },
      },
      render: (text) =>
        filteredColumns.includes("damageSource") ? (
          <Highlighter
            highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
            searchWords={sourceSearchText.split(/,|，/)}
            autoEscape
            textToHighlight={text ? text.toString() : ""}
          />
        ) : (
          text
        ),
    },
    {
      title: "职业",
      dataIndex: "role",
    },
    // {
    //   title: "种族",
    //   dataIndex: "race",
    // },
    {
      title: "总伤害",
      dataIndex: "damageCount",
    },
    {
      title: "DPS",
      dataIndex: "dps",
    },
    {
      title: "暴击率",
      dataIndex: "criticalRate",
      render: (_, record) => `${record.criticalRate.toFixed(2)}%`,
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <a
          onClick={() =>
            setSkillModalProps({ open: true, sourceName: record.damageSource })
          }
        >
          技能明细
        </a>
      ),
    },
  ];

  const conditionalAnalyze = (filterTargets?: string[]) => {
    const damageObject: Record<
      string,
      {
        count: number;
        criticalTimes: number;
        skillTimes: number;
      }
    > = {};

    const targetCondition = (targetName: string) => {
      if (filterTargets) {
        return filterTargets.includes(targetName);
      }
      return true;
    };

    for (let index = 0; index < logList.length; index++) {
      const log = logList[index];
      if (log.damageDetail && targetCondition(log.damageDetail.targetName)) {
        const damageDetail = log.damageDetail;
        const source = damageDetail.sourceName;
        const target = damageDetail.targetName;

        if (!hasInitalized.current) {
          // 更新目标
          if (!allTargets.current.includes(target)) {
            allTargets.current.push(target);
          }
        }

        // 已有的伤害来源
        if (damageObject[source]) {
          damageObject[source].count += damageDetail.damage;
          if (
            damageDetail.skillName !== NORMAL_ATTACK &&
            damageDetail.isCritical
          ) {
            damageObject[source].criticalTimes += 1;
          }
          if (damageDetail.skillName !== NORMAL_ATTACK && !damageDetail.isDot) {
            damageObject[source].skillTimes += 1;
          }
        } else {
          damageObject[source] = {
            count: damageDetail.damage,
            skillTimes:
              damageDetail.skillName !== NORMAL_ATTACK && !damageDetail.isDot
                ? 1
                : 0,
            criticalTimes: damageDetail.isCritical ? 1 : 0,
          };
        }
      }
    }

    const sourceList = Object.keys(damageObject)
      .map((key) => ({
        key,
        damageSource: key,
        damageCount: damageObject[key].count,
        criticalRate: damageObject[key].criticalTimes
          ? (damageObject[key].criticalTimes / damageObject[key].skillTimes) *
            100
          : 0,
        dps: 0,
      }))
      .sort((a, b) => b.damageCount - a.damageCount);

    // allSources.current = sourceList.map((x) => x.damageSource);

    setDataSource(sourceList);
  };

  return (
    <>
      <Table<DataType>
        columns={columns}
        dataSource={dataSource}
        title={() => (
          <Space>
            {/* <Select
          mode="multiple"
          style={{ width: 500 }}
          value={sourceList}
          allowClear
          placeholder="筛选伤害来源"
          maxTagCount="responsive"
          options={allSources.current.map((item) => ({
            label: item,
            value: item,
          }))}
          onChange={(values) => setSourceList(values)}
        /> */}

            <Select
              mode="multiple"
              style={{ width: 500 }}
              allowClear
              placeholder="筛选伤害目标"
              maxTagCount="responsive"
              value={targetList}
              options={allTargets.current.map((item) => ({
                label: item,
                value: item,
              }))}
              onChange={(values) => setTargetList(values)}
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <Space style={{ padding: "0 8px 4px" }}>
                    <Button
                      type="text"
                      onClick={() => {
                        const bossList = bosses.map((boss) => boss.name);
                        const namedBoss = bossList.filter((boss) =>
                          allTargets.current.includes(boss)
                        );
                        setTargetList(namedBoss);
                      }}
                    >
                      选择所有命名怪
                    </Button>
                  </Space>
                </>
              )}
            />

            <Button
              type="primary"
              onClick={() =>
                conditionalAnalyze(
                  targetList.length > 0 ? targetList : undefined
                )
              }
            >
              确认
            </Button>
          </Space>
        )}
      />

      <SkillModal
        skillMap={skillMap}
        sourceName=""
        open={false}
        filteredTargets={targetList}
        handleOk={() => setSkillModalProps({ open: false, sourceName: "" })}
        handleCancel={() => setSkillModalProps({ open: false, sourceName: "" })}
        {...skillModalProps}
      ></SkillModal>
    </>
  );
}

export default DamageMeter;
