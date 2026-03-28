import { calcArrayIntersection, removeTrailingRoman } from "../../ui/util";
import { attackFilter } from "./attackFilter";
import { NORMAL_ATTACK, Role } from "./constant";
import { allSkillLib } from "./roles";
import { tagFilter } from "./tagFilter";
import {
  AnalyzedResult,
  Log,
  MessageData,
  DamageSource,
  Skill,
  Tag,
} from "./types";

// 用于符合日志规范的正则
const usefulRegex = /^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}) : (.*)$/;

// 日志结果
let startTime: string = "";
let endTime: string = "";
let logList: Log[] = [];
let tagList: Tag[] = [];
const skillMap: Map<string, Skill> = new Map();
const damageSourceMap: Map<string, DamageSource> = new Map();

async function readLine(file: File) {
  // 先读取原始文件内容，一行一行解析
  const lines: string[] = [];
  const reader = file.stream().getReader();
  const decoder = new TextDecoder("GB2312");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 解码二进制流为文本
      buffer += decoder.decode(value, { stream: true });

      // 按行分割
      const linesArray = buffer.split(/\r?\n/);
      buffer = linesArray.pop() || ""; // 保留最后一行（可能不完整）

      lines.push(...linesArray);
    }

    // 处理最后一行
    if (buffer) {
      lines.push(buffer);
    }
    return lines;
  } catch (err) {
    console.error("读取失败:", err);
    return [];
  }
}

function filterLog(lines: string[], dateTimeRange?: [number, number]) {
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    // 提取时间戳和后续内容, 不匹配的直接丢弃
    const match = line.match(usefulRegex);
    if (match) {
      const logTime = match[1];
      const logContent = match[2];

      if (!dateTimeRange) {
        // 先过滤总的时间Tag
        if (!startTime) {
          startTime = logTime;
        }
        if (!endTime) {
          endTime = logTime;
        }

        if (new Date(logTime).getTime() > new Date(endTime).getTime()) {
          endTime = logTime;
        }
        tagFilter(logTime, logContent, tagList);
      } else {
        // 过滤时间范围内的日志
        if (
          new Date(logTime).getTime() >= new Date(dateTimeRange[0]).getTime() &&
          new Date(logTime).getTime() <= new Date(dateTimeRange[1]).getTime()
        ) {
          attackFilter({
            logTime,
            logContent,
            logList,
            damageSourceMap,
            skillMap,
          });
        }
      }
    }
  }

  // 处理DamageSource的role和race
  damageSourceMap.forEach((source) => {
    const usedSkills = source.usedSkills
      .filter((s) => s !== NORMAL_ATTACK)
      .map((s) => removeTrailingRoman(s));

    const universalSkills = allSkillLib.universal;
    const roles = Object.keys(allSkillLib);

    for (let index = 0; index < roles.length; index++) {
      const currentRole = roles[index];
      const roleSkills = (allSkillLib as Record<string, string[]>)[currentRole];
      if (currentRole !== "universal") {
        const { intersection, onlyInArr2 } = calcArrayIntersection(
          roleSkills,
          usedSkills,
        );

        if (intersection.length >= 3) {
          // 用了三个以上的职业技能
          source.role = Role[currentRole as keyof typeof Role];
          break;
        } else if (intersection.length >= 1) {
          const { intersection: inter, onlyInArr2: only2 } =
            calcArrayIntersection(universalSkills, usedSkills);
          if (inter.length >= 1) {
            source.role = Role[currentRole as keyof typeof Role];
            break;
          } else if (only2.length <= 1 || onlyInArr2.length <= 1) {
            source.role = Role[currentRole as keyof typeof Role];
            break;
          }
        }
      }
    }
  });

  return {
    startTime,
    endTime,
    logList,
    tagList,
    skillMap,
    damageSourceMap,
  };
}

async function readLog(file: File, dateTimeRange?: [number, number]) {
  // 先清空数据
  logList = [];
  tagList = [];
  skillMap.clear();
  damageSourceMap.clear();

  // 先读取原始文件内容，一行一行解析
  const lines = await readLine(file);

  // 过滤日志，只保留有用信息
  const resData = filterLog(lines, dateTimeRange);

  return resData;
}

self.onmessage = (e: MessageEvent<MessageData>) => {
  const data = e.data;
  if (data.type === "logAnalyze") {
    readLog(data.file, data.dateTimeRange).then((resData: AnalyzedResult) => {
      self.postMessage({
        type: data.dateTimeRange ? "log-result" : "tag-result",
        data: resData,
      });
    });
  }
};
