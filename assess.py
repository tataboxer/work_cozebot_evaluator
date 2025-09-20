#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import requests
import json
import os
import sys
import time
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# 加载环境变量
load_dotenv()

# 创建全局锁保护CSV写入
csv_lock = threading.Lock()

def parse_context_simple(context_str):
    """简单解析context字符串为Python对象"""
    if not context_str or context_str.strip() == '':
        return None
    
    try:
        # 直接解析JSON数组（现在数据生成时已经是标准格式）
        context_data = json.loads(context_str)
        return context_data if isinstance(context_data, list) else None
    except json.JSONDecodeError as e:
        print(f"⚠️ Context解析失败: {e}")
        return None

def evaluate_with_llm(question, answer, context=None):
    """调用LLM API进行评估"""

    # 构建上下文信息
    context_text = ""
    if context:
        context_data = None
        if isinstance(context, str):
            context_data = parse_context_simple(context)
        elif isinstance(context, list):
            context_data = context
        
        if context_data and len(context_data) > 0:
            context_text = "\n对话历史:\n"
            for i, msg in enumerate(context_data):
                role = "用户" if msg.get('role') == 'user' else "助手"
                content = msg.get('content', '')
                context_text += f"{i+1}. {role}: {content}\n"
            context_text += "\n"

    prompt = f"""你是一个专业的AI评估专家，现在需要评估苏州科技馆数字人助手趣波（QuBoo）的回复质量。

背景：趣波是苏州科技馆的AI智能助手，专门为游客提供科技馆参观、票务、展厅、活动等相关信息和服务，帮助游客获得优质的科技体验。

对话历史: {context_text}
用户问题: {question}
助手回复: {answer}

请从以下三个角度评估回复质量：

1. 最终准确率：回复内容是否准确回答了用户问题，是否解决了用户的查询需求，是否与科技馆业务目标高度贴合。{"考虑上下文连贯性，但不需要评判对话历史用assistant的回复" if context_text else ""} 评分1-100分。

2. 专业度：用词是否精准、术语是否正确、业务上下文是否符合科技馆场景的专业水准。评分1-100分。

3. 语气合理：语气是否礼貌友好、风格是否匹配科技馆数字助手场景（亲切、引导性、专业但不生硬）。评分1-100分。

请以JSON格式输出评估结果：
{{
  "最终准确率": {{"分数": 数字, "理由": "简要说明"}},
  "专业度": {{"分数": 数字, "理由": "简要说明"}},
  "语气合理": {{"分数": 数字, "理由": "简要说明"}}
}}"""

    # 从环境变量读取配置
    llm_url = os.getenv('llm_url')
    llm_api_key = os.getenv('llm_api_key')
    llm_model_name = os.getenv('llm_model_name')

    if not all([llm_url, llm_api_key, llm_model_name]):
        raise ValueError("环境变量配置不完整，请检查 .env 文件")

    api_url = f"{llm_url}chat/completions"

    headers = {
        'Authorization': f'Bearer {llm_api_key}',
        'Content-Type': 'application/json'
    }

    data = {
        'model': llm_model_name,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.1
    }

    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"正在评估问题: {question[:30]}{'...' if len(question) > 30 else ''}")
            response = requests.post(api_url, headers=headers, json=data, timeout=60)

            if response.status_code == 200:
                result = response.json()['choices'][0]['message']['content']

                # 处理markdown格式
                if '```json' in result:
                    json_match = result.split('```json')[1].split('```')[0].strip()
                    return json.loads(json_match)
                else:
                    return json.loads(result)
            elif response.status_code == 429:
                # API限流，等待后重试
                wait_time = 2 ** attempt  # 指数退避
                print(f"API限流，第{attempt+1}次重试，等待{wait_time}秒...")
                time.sleep(wait_time)
                continue
            else:
                print(f"API调用失败: {response.status_code} - {response.text}")
                return None

        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"网络请求异常，第{attempt+1}次重试，等待{wait_time}秒: {e}")
                time.sleep(wait_time)
                continue
            else:
                print(f"网络请求异常，已重试{max_retries}次: {e}")
                return None

    # 如果所有重试都失败，返回None
    print(f"评估失败，已达到最大重试次数")
    return None

def process_single_row(row_data, csv_file_path):
    """处理单行数据的函数（用于并发处理）"""
    index, row = row_data
    question = str(row['question_text'])
    answer = str(row['block_result'])
    
    # 获取上下文数据
    context = None
    if 'context' in row and pd.notna(row['context']) and str(row['context']).strip():
        context = str(row['context'])

    # 跳过空内容
    if not answer or answer.strip() == '':
        print(f"跳过第{index+1}行: 回复内容为空")
        return {'index': index, 'success': False, 'error': '空内容'}

    # 显示context信息
    context_info = " (无上下文)"
    if context:
        context_data = parse_context_simple(context)
        if context_data and isinstance(context_data, list):
            context_info = f" (含{len(context_data)}条上下文)"
        else:
            context_info = " (上下文格式错误)"
    print(f"\n[{index+1}] 正在处理问题: {question[:30]}{'...' if len(question) > 30 else ''}{context_info}")

    # 添加随机延时避免API限流（1-3秒）
    delay = 1 + (index % 3)
    time.sleep(delay)

    # 调用LLM评估
    evaluation = evaluate_with_llm(question, answer, context)

    if evaluation:
        try:
            # 使用锁保护CSV写入操作
            with csv_lock:
                # 重新读取最新数据（因为其他线程可能已经更新了）
                df = pd.read_csv(csv_file_path, encoding='utf-8-sig')

                # 填充评估结果
                df.at[index, '最终准确率_分数'] = evaluation['最终准确率']['分数']
                df.at[index, '最终准确率_理由'] = evaluation['最终准确率']['理由']
                df.at[index, '专业度_分数'] = evaluation['专业度']['分数']
                df.at[index, '专业度_理由'] = evaluation['专业度']['理由']
                df.at[index, '语气合理_分数'] = evaluation['语气合理']['分数']
                df.at[index, '语气合理_理由'] = evaluation['语气合理']['理由']

                # 立即写入文件
                df.to_csv(csv_file_path, index=False, encoding='utf-8-sig')

            print(f"✓ 评估成功 - 准确率:{evaluation['最终准确率']['分数']} 专业度:{evaluation['专业度']['分数']} 语气:{evaluation['语气合理']['分数']}")
            return {'index': index, 'success': True, 'evaluation': evaluation}

        except KeyError as e:
            print(f"✗ 评估结果格式错误: {e}")
            return {'index': index, 'success': False, 'error': f'格式错误: {e}'}
    else:
        print(f"✗ 评估失败")
        return {'index': index, 'success': False, 'error': '评估失败'}

def process_csv_evaluation(csv_file_path):
    """处理CSV文件并添加评估结果"""

    print(f"开始处理文件: {csv_file_path}")

    # 读取CSV文件
    try:
        df = pd.read_csv(csv_file_path, encoding='utf-8-sig')
    except UnicodeDecodeError:
        df = pd.read_csv(csv_file_path, encoding='gbk')

    print(f"原始数据行数: {len(df)}")
    print(f"原始列名: {list(df.columns)}")

    # 初始化新列（仅当列不存在时）
    if '最终准确率_分数' not in df.columns:
        df['最终准确率_分数'] = None
    if '最终准确率_理由' not in df.columns:
        df['最终准确率_理由'] = None
    if '专业度_分数' not in df.columns:
        df['专业度_分数'] = None
    if '专业度_理由' not in df.columns:
        df['专业度_理由'] = None
    if '语气合理_分数' not in df.columns:
        df['语气合理_分数'] = None
    if '语气合理_理由' not in df.columns:
        df['语气合理_理由'] = None

    # 筛选需要评估的行：block_type=answer 且 block_subtype为文本回复 且 没有评估数据
    # 只有当所有评估列都有数据时才跳过，否则需要重新评估
    evaluation_rows = df[
        (df['block_type'] == 'answer') &
        (df['block_subtype'] == '文本回复') &
        (
            df['最终准确率_分数'].isna() | 
            df['最终准确率_理由'].isna() |
            df['专业度_分数'].isna() |
            df['专业度_理由'].isna() |
            df['语气合理_分数'].isna() |
            df['语气合理_理由'].isna()
        )
    ]

    print(f"需要评估的行数: {len(evaluation_rows)}")
    print(f"已有评估数据的行数: {len(df) - len(evaluation_rows)}")
    
    # 调试信息：显示筛选条件的详细情况
    answer_rows = df[df['block_type'] == 'answer']
    text_reply_rows = df[(df['block_type'] == 'answer') & (df['block_subtype'] == '文本回复')]
    
    print(f"调试信息:")
    print(f"  - 总行数: {len(df)}")
    print(f"  - block_type=answer 的行数: {len(answer_rows)}")
    print(f"  - block_subtype=文本回复 的行数: {len(text_reply_rows)}")
    
    # 检查已评估的行
    fully_evaluated = df[
        (df['block_type'] == 'answer') &
        (df['block_subtype'] == '文本回复') &
        (~df['最终准确率_分数'].isna()) &
        (~df['最终准确率_理由'].isna()) &
        (~df['专业度_分数'].isna()) &
        (~df['专业度_理由'].isna()) &
        (~df['语气合理_分数'].isna()) &
        (~df['语气合理_理由'].isna())
    ]
    print(f"  - 完全评估过的文本回复行数: {len(fully_evaluated)}")
    
    # 显示前几行的评估状态样例
    if len(text_reply_rows) > 0:
        print(f"\n前3行文本回复的评估状态:")
        for i, (idx, row) in enumerate(text_reply_rows.head(3).iterrows()):
            accuracy_score = row.get('最终准确率_分数', 'N/A')
            accuracy_reason = row.get('最终准确率_理由', 'N/A')
            professional_score = row.get('专业度_分数', 'N/A')
            tone_score = row.get('语气合理_分数', 'N/A')
            print(f"  行{idx+1}: 准确率={accuracy_score}, 专业度={professional_score}, 语气={tone_score}, 理由={'有' if pd.notna(accuracy_reason) and str(accuracy_reason).strip() else '无'}")

    if len(evaluation_rows) == 0:
        print("✅ 所有符合条件的行都已有评估数据，跳过评估")
        return csv_file_path  # 返回原文件路径

    # 从环境变量读取线程数配置，默认为5
    max_workers = int(os.getenv('ASSESS_THREADS', 5))
    print(f"开始使用{max_workers}个线程并发处理 {len(evaluation_rows)} 行数据...")
    print(f"📊 配置信息: 最大评估线程数 = {max_workers}")

    # 使用ThreadPoolExecutor并发处理
    evaluated_count = 0
    success_count = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # 提交所有任务
        future_to_task = {
            executor.submit(process_single_row, (index, row), csv_file_path): index
            for index, row in evaluation_rows.iterrows()
        }

        # 等待所有任务完成
        for future in as_completed(future_to_task):
            task_index = future_to_task[future]
            try:
                result = future.result()
                evaluated_count += 1

                if result['success']:
                    success_count += 1
                else:
                    print(f"任务 {task_index+1} 失败: {result.get('error', '未知错误')}")

                # 显示进度
                print(f"进度: {evaluated_count}/{len(evaluation_rows)} 已完成")

            except Exception as exc:
                print(f'处理第 {task_index+1} 行时发生异常: {exc}')
                evaluated_count += 1

    print("\n" + "="*60)
    print("🎉 并发评估完成！")
    print("="*60)
    print(f"文件已更新: {csv_file_path}")
    print(f"总行数: {len(df)}")
    print(f"评估行数: {evaluated_count}")
    print(f"成功评估: {success_count}")
    print(f"成功率: {(success_count/evaluated_count*100):.1f}%" if evaluated_count > 0 else "0%")
    print(f"并发线程数: {max_workers}")

    return csv_file_path

def main():
    print("=" * 60)
    print("LLM 回复质量评估工具")
    print("=" * 60)

    if len(sys.argv) != 2:
        print("用法: python assess.py <csv_file_path>")
        print("示例: python assess.py data/results_20250918_184058.csv")
        sys.exit(1)

    csv_file = sys.argv[1]

    if not os.path.exists(csv_file):
        print(f"❌ 文件不存在: {csv_file}")
        sys.exit(1)

    # 检查.env文件
    if not os.path.exists('.env'):
        print("❌ 未找到 .env 文件，请确保包含以下配置:")
        print("  llm_url=https://api-inference.modelscope.cn/v1/")
        print("  llm_api_key=your_api_key")
        print("  llm_model_name=Qwen/Qwen3-Coder-480B-A35B-Instruct")
        sys.exit(1)

    try:
        output_file = process_csv_evaluation(csv_file)
        print(f"✅ 评估结果已保存到: {output_file}")
    except Exception as e:
        print(f"❌ 处理过程中出错: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()