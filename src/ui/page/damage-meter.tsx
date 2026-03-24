import { Button, Divider, Select, Space, Table, TableProps } from "antd";
import { DamageSource, Log, Skill } from "../../worker/read-log/types";
import { useEffect, useRef, useState } from "react";
import { bosses, NORMAL_ATTACK } from "../../worker/read-log/constant";
import SkillModal, { SkillModalProps } from "./skill-modal";
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
  const [dataSource, setDataSource] = useState<DataType[]>([]);
  const [sourceList, setSourceList] = useState<string[]>([]);
  const [targetList, setTargetList] = useState<string[]>([]);
  const [skillModalProps, setSkillModalProps] = useState<
    Partial<SkillModalProps>
  >({
    open: false,
    sourceName: "",
  });

  const allSources = useRef<string[]>([]);
  const allTargets = useRef<string[]>([]);

  useEffect(() => {
    const damageObject: Record<
      string,
      {
        count: number;
        criticalTimes: number;
        skillTimes: number;
      }
    > = {};
    for (let index = 0; index < logList.length; index++) {
      const log = logList[index];
      if (log.damageDetail) {
        const damageDetail = log.damageDetail;
        const source = damageDetail.sourceName;
        const target = damageDetail.targetName;

        // 更新目标
        if (!allTargets.current.includes(target)) {
          allTargets.current.push(target);
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

    allSources.current = sourceList.map((x) => x.damageSource);

    setDataSource(sourceList);
  }, [logList]);

  const columns: TableProps<DataType>["columns"] = [
    {
      title: "伤害源",
      dataIndex: "damageSource",
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

  return (
    <>
      <Space>
        <Select
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
        />

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
                      allSources.current.includes(boss)
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

        <Button type="primary" onClick={() => {}}>
          确认
        </Button>
      </Space>

      <Table<DataType> columns={columns} dataSource={dataSource} />

      <SkillModal
        skillMap={skillMap}
        sourceName=""
        open={false}
        handleOk={() => setSkillModalProps({ open: false })}
        handleCancel={() => setSkillModalProps({ open: false })}
        {...skillModalProps}
      ></SkillModal>
    </>
  );
}

export default DamageMeter;
