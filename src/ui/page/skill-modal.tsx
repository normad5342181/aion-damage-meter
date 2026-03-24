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
}
export interface SkillModalProps {
  sourceName: string;
  open: boolean;
  handleOk: () => void;
  handleCancel: () => void;
  skillMap: Map<string, Skill>;
}

function SkillModal({
  sourceName,
  open,
  handleOk,
  handleCancel,
  skillMap,
}: SkillModalProps) {
  const [dataSource, setDataSource] = useState<SkillData[]>([]);

  useEffect(() => {
    const resArr: SkillData[] = [];
    skillMap.forEach((skill) => {
      if (skill.sourceName === sourceName) {
        const foundSkill = resArr.find((x) => x.skillName === skill.skillName);
        //有效技能
        const isEffectiveSkill = !skill.isDot;

        if (foundSkill) {
          foundSkill.usedTimes += isEffectiveSkill ? 1 : 0;
          foundSkill.criticalTimes += skill.isCritical ? 1 : 0;
          foundSkill.damageCount += skill.damage || 0;
        } else {
          resArr.push({
            key: skill.skillName,
            skillName: skill.skillName,
            damageCount: skill.damage || 0,
            usedTimes: isEffectiveSkill ? 1 : 0,
            criticalTimes: skill.isCritical ? 1 : 0,
          });
        }
      }
    });

    setDataSource(resArr.sort((a, b) => b.damageCount - a.damageCount));
  }, [sourceName, skillMap]);

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
