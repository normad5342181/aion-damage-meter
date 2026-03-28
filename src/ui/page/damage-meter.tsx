import {
  Button,
  Divider,
  Input,
  InputRef,
  Select,
  Space,
  Table,
  TableProps,
  Tag,
} from "antd";
import { DamageSource, Log, Skill } from "../../worker/read-log/types";
import { useEffect, useRef, useState } from "react";
import { bosses, NORMAL_ATTACK, Role } from "../../worker/read-log/constant";
import SkillModal, { SkillModalProps } from "./skill-modal";
import { SearchOutlined } from "@ant-design/icons";
import Highlighter from "react-highlight-words";
import { FilterValue } from "antd/es/table/interface";
import { getRoleFilters, matchSpecialRole, removeTrailingRoman } from "../util";
import { signedMinions } from "../../worker/read-log/roles/minion";
import { allSkillLib } from "../../worker/read-log/roles";

interface DataType {
  key: string;
  damageSource: string;
  role?: Role;
  race?: string;
  damageCount: number;
  dps: number;
  criticalRate: number;
  childrenPer?: number;
  children?: DataType[];
}

interface IProps {
  logList: Log[];
  skillMap: Map<string, Skill>;
  damageSourceMap: Map<string, DamageSource>;
}

function DamageMeter({ logList, skillMap, damageSourceMap }: IProps) {
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
    filteredTargets: [],
  });

  //伤害来源的搜索词
  const [sourceSearchText, setSourceSearchText] = useState<string>("");
  // 已经筛选的列
  const [filteredColumns, seFilteredColumns] = useState<(keyof DataType)[]>([]);
  // 用来存放各列的 filteredValue 状态
  const [filteredValues, setFilteredValues] = useState<
    Record<string, FilterValue | null>
  >({});

  const hasInitalized = useRef(false);
  // const allSources = useRef<string[]>([]);
  const allTargets = useRef<string[]>([]);
  const searchInput = useRef<InputRef>(null);

  useEffect(() => {
    // 日志列表更新，重置整个页面
    hasInitalized.current = false;
    setDataSource([]);
    setTargetList([]);
    setSkillModalProps({
      open: false,
      sourceName: "",
      filteredTargets: [],
    });
    setSourceSearchText("");
    seFilteredColumns([]);
    allTargets.current = [];
    for (const c in filteredValues) filteredValues[c] = null;
    // filteredValues.role = getDefaultRoleFilters();
    setFilteredValues({ ...filteredValues });

    if (logList.length > 0) {
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
      title: "序号",
      dataIndex: "index",
      rowScope: "row",
      render: (_, __, index) => index,
    },
    {
      title: "伤害源",
      dataIndex: "damageSource",
      filterIcon: (filtered: boolean) => (
        <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
      ),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm }) => (
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
                  : [...filteredColumns, "damageSource"],
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
                    : [...filteredColumns, "damageSource"],
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
                setSourceSearchText("");
                seFilteredColumns(
                  filteredColumns.filter((c) => c !== "damageSource"),
                );
                setFilteredValues({ ...filteredValues, damageSource: null });
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
      filteredValue: filteredValues?.damageSource,
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
      title: "聚合伤害源",
      dataIndex: "childrenPer",
      render: (_, row) => {
        console.log("row", row);
        if (row?.children && row?.children?.length > 0) {
          return (
            <>
              {row.children.forEach((e) => (
                <Tag key={e.damageSource} variant="filled">
                  {(row?.childrenPer || 0) >= 0.99999999
                    ? ""
                    : `${((row?.childrenPer || 0) * 100).toFixed(1)}%`}{" "}
                  {e.damageSource}
                </Tag>
              ))}
            </>
          );
        } else {
          return null;
        }
      },
    },
    {
      title: "职业",
      dataIndex: "role",
      filters: getRoleFilters(),
      filterMultiple: true,
      filteredValue: filteredValues?.role,
      onFilter: (value, record) => {
        return record.role === value;
      },
    },
    {
      title: "总伤害",
      dataIndex: "damageCount",
      render: (_, row) => {
        if (row?.children && row?.children?.length > 0) {
          const childrenCount = row?.children?.reduce(
            (count, cur) => count + cur.damageCount,
            0,
          );
          return row.damageCount + (row.childrenPer || 0) * childrenCount;
        } else {
          return row.damageCount;
        }
      },
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
            setSkillModalProps({
              open: true,
              sourceName: record.damageSource,
              filteredTargets: targetList,
            })
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
        role: damageSourceMap.get(key)?.role || matchSpecialRole(key),
      }))
      .sort((a, b) => b.damageCount - a.damageCount);

    // allSources.current = sourceList.map((x) => x.damageSource);

    setDataSource(sourceList);
  };

  const combineData = () => {
    const roleMap = new Map<
      Role,
      {
        masters: DataType[];
        minions: DataType[];
      }
    >();

    const setMapValue = (
      key: Role,
      val: DataType,
      type: "master" | "minion",
    ) => {
      const oldValue = roleMap.get(key);
      if (type === "master") {
        if (oldValue) {
          roleMap.set(key, {
            ...oldValue,
            masters: [...oldValue.masters, val],
          });
        } else {
          roleMap.set(key, {
            minions: [],
            masters: [val],
          });
        }
      } else {
        if (oldValue) {
          roleMap.set(key, {
            ...oldValue,
            minions: [...oldValue.minions, val],
          });
        } else {
          roleMap.set(key, {
            minions: [val],
            masters: [],
          });
        }
      }
    };

    dataSource.forEach((row) => {
      const sourceName = removeTrailingRoman(row.damageSource);
      const rowRole = row.role;
      if (
        rowRole &&
        [
          Role.Templar,
          Role.Gladiator,
          Role.Assassin,
          Role.Ranger,
          Role.Cleric,
          Role.Sorcerer,
          Role.Spiritmaster,
          Role.Chanter,
        ].includes(rowRole)
      ) {
        setMapValue(rowRole, row, "master");
      }

      // 先找召唤物
      const foundMinion = signedMinions.find(
        (minion) => minion.name === sourceName,
      );
      if (foundMinion) {
        if (Array.isArray(foundMinion.belong)) {
          foundMinion.belong.forEach((belong) => {
            setMapValue(belong, row, "minion");
          });
        } else {
          setMapValue(foundMinion.belong, row, "minion");
        }
      }

      // 再找技能
      const roles = Object.keys(allSkillLib);
      for (let index = 0; index < roles.length; index++) {
        const currentRole = roles[index];
        const roleSkills = (allSkillLib as Record<string, string[]>)[
          currentRole
        ];
        if (currentRole !== "universal") {
          if (roleSkills.includes(sourceName)) {
            setMapValue(Role[currentRole as keyof typeof Role], row, "minion");
          }
        }
      }
    });

    const newDataSource: DataType[] = [];

    let allMinionStrs: string[] = [];

    for (const value of roleMap.values()) {
      allMinionStrs = allMinionStrs.concat(
        value.minions.map((x) => x.damageSource),
      );
    }

    dataSource.forEach((row) => {
      const rowRole = row.role;
      const damageSource = row.damageSource;
      if (rowRole) {
        const about = roleMap.get(rowRole);
        if (
          about?.masters?.map((x) => x.damageSource)?.includes(damageSource) &&
          about?.minions?.length > 0
        ) {
          const masterAllDamage = about?.masters.reduce(
            (count, cur) => count + cur.damageCount,
            0,
          );

          const percent = row.damageCount / masterAllDamage;
          const perMinions = about?.minions?.map((x) => ({
            ...x,
            key: `${damageSource}-${x.damageSource}`,
            damageCount: x.damageCount * percent,
            dps: x.dps * percent,
          }));

          newDataSource.push({
            ...row,
            children: perMinions,
            childrenPer: percent,
          });
        } else if (!allMinionStrs?.includes(damageSource)) {
          newDataSource.push(row);
        }
      }
    });

    setDataSource(newDataSource);
  };

  return (
    <>
      <Table<DataType>
        columns={columns}
        dataSource={dataSource}
        onChange={(_, filters) => {
          setFilteredValues(filters);
        }}
        title={() => (
          <div className="damage-meter-table-title">
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
                            allTargets.current.includes(boss),
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
                    targetList.length > 0 ? targetList : undefined,
                  )
                }
              >
                确认
              </Button>
            </Space>

            <Space>
              <Button
                type="primary"
                disabled={dataSource.length === 0}
                onClick={combineData}
              >
                聚合数据
              </Button>
            </Space>
          </div>
        )}
      />

      <SkillModal
        skillMap={skillMap}
        sourceName=""
        open={false}
        handleOk={() =>
          setSkillModalProps({
            open: false,
            sourceName: "",
            filteredTargets: [],
          })
        }
        handleCancel={() =>
          setSkillModalProps({
            open: false,
            sourceName: "",
            filteredTargets: [],
          })
        }
        {...skillModalProps}
      ></SkillModal>
    </>
  );
}

export default DamageMeter;
