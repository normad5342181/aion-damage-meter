import { Modal, Table, TableProps } from "antd";
import { useEffect, useState } from "react";
import { Skill } from "../../worker/read-log/types";
import Text from "antd/es/typography/Text";

interface SkillData {
  key: string;
  skillName: string;
  damageCount: number;
  usedTimes: number;
  criticalTimes: number;
  detail: Skill[];
}
export interface SkillModalProps {
  sourceName: string;
  open: boolean;
  handleOk: () => void;
  handleCancel: () => void;
  skillMap: Map<string, Skill>;
  filteredTargets?: string[];
}

function SkillModal({
  sourceName,
  open,
  handleOk,
  handleCancel,
  skillMap,
  filteredTargets = [],
}: SkillModalProps) {
  const [dataSource, setDataSource] = useState<SkillData[]>([]);

  useEffect(() => {
    const resArr: SkillData[] = [];

    const matchTarget = (skill: Skill) => {
      if (filteredTargets?.length > 0) {
        const objs = skill?.targetObjects?.filter((to) => {
          return filteredTargets.some((x) => x === to.targetName);
        });
        const criticalTimes = objs.filter((o) => o.isCritical).length;
        return objs?.length > 0
          ? {
              criticalTimes: criticalTimes / (skill.targetObjects.length || 1),
              damage: objs.reduce(
                (count, current) => count + (current?.damage || 0),
                0,
              ),
            }
          : false;
      } else {
        return true;
      }
    };

    skillMap.forEach((skill) => {
      const targetRes = matchTarget(skill);
      if (skill.sourceName === sourceName && Boolean(targetRes)) {
        const foundSkill = resArr.find((x) => x.skillName === skill.skillName);
        //有效技能
        const isEffectiveSkill = !skill.isDot;

        let criticalTimes = 0;
        let damage = 0;
        if (typeof targetRes == "boolean") {
          const thisCriticalTimes = skill.targetObjects.filter(
            (o) => o.isCritical,
          ).length;
          criticalTimes = thisCriticalTimes / (skill.targetObjects.length || 1);
          damage = skill.targetObjects.reduce(
            (count, current) => count + (current?.damage || 0),
            0,
          );
        } else {
          criticalTimes = targetRes.criticalTimes;
          damage = targetRes.damage;
        }

        if (foundSkill) {
          foundSkill.usedTimes += isEffectiveSkill ? 1 : 0;
          foundSkill.criticalTimes += criticalTimes;
          foundSkill.damageCount += damage;
          foundSkill.detail.push(skill);
        } else {
          resArr.push({
            key: skill.skillName,
            skillName: skill.skillName,
            damageCount: damage,
            usedTimes: isEffectiveSkill ? 1 : 0,
            criticalTimes: criticalTimes,
            detail: [skill],
          });
        }
      }
    });

    setDataSource(resArr.sort((a, b) => b.damageCount - a.damageCount));
  }, [sourceName, skillMap, filteredTargets]);

  const columns: TableProps<SkillData>["columns"] = [
    {
      title: "技能名称",
      dataIndex: "skillName",
    },
    {
      title: "总伤害量",
      dataIndex: "damageCount",
    },
    {
      title: "使用次数",
      dataIndex: "usedTimes",
    },
    {
      title: "暴击次数",
      dataIndex: "criticalTimes",
    },
    {
      title: "暴击率",
      key: "criticalRate",
      render: (_, record) =>
        `${((record.criticalTimes / record.usedTimes) * 100).toFixed(2)}%`,
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <a
          onClick={() => {
            const dataList = record.detail.reduce(
              (resArr: Skill["targetObjects"][], cur) => {
                return resArr.concat(
                  cur.targetObjects.map((t) => {
                    return { ...t, dateTime: cur.dateTime };
                  }),
                );
              },
              [],
            );

            Modal.info({
              title: record.skillName,
              footer: null,
              closable: true,
              width: 600,
              content: (
                <Table
                  size="small"
                  key="dateTime"
                  columns={[
                    { title: "时间", dataIndex: "dateTime" },
                    { title: "目标", dataIndex: "targetName" },
                    { title: "伤害量", dataIndex: "damage" },
                    {
                      title: "暴击",
                      dataIndex: "isCritical",
                      render: (x) => (x ? "是" : "否"),
                    },
                  ]}
                  dataSource={dataList}
                />
              ),
            });
          }}
        >
          详情列表
        </a>
      ),
    },
  ];

  return (
    <Modal
      title={`${sourceName}-技能明细`}
      width={1000}
      closable
      open={open}
      footer={null}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Table<SkillData>
        size="small"
        columns={columns}
        pagination={false}
        scroll={{ y: 500 }}
        dataSource={dataSource}
        summary={(pageData) => {
          let totalDamage = 0;
          pageData.forEach(({ damageCount }) => {
            totalDamage += damageCount;
          });
          return (
            <>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text type="danger">{totalDamage}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </>
          );
        }}
      />
    </Modal>
  );
}

export default SkillModal;
