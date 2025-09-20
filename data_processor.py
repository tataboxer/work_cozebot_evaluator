#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import json
import pandas as pd
import os
import sys
from datetime import datetime
import time
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False
    print("警告: 未安装 openpyxl，将无法读取 .xlsx 文件")
    print("安装命令: pip install openpyxl")

try:
    import xlrd
    HAS_XLRD = True
except ImportError:
    HAS_XLRD = False
    print("警告: 未安装 xlrd，将无法读取 .xls 文件")
    print("安装命令: pip install xlrd")

def call_coze_bot(content, context=None):
    """调用coze-bot-core.js并返回结果"""
    try:
        # 确保content是字符串类型
        if not isinstance(content, str):
            content = str(content)

        print(f"准备调用Node.js，内容: {content[:50]}{'...' if len(content) > 50 else ''}")

        # 构建命令参数 - 简化版本，只传content和context
        if context:
            # 有上下文模式
            context_json = json.dumps(context, ensure_ascii=False)
            actual_cmd_args = ['node', 'coze-bot-core.js', content, context_json]
            
        else:
            # 无上下文模式
            actual_cmd_args = ['node', 'coze-bot-core.js', content]
            
        # 调用Node.js脚本
        result = subprocess.run(
            actual_cmd_args,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',  # 处理解码错误
            cwd=os.path.dirname(os.path.abspath(__file__)),
            timeout=60  # 60秒超时
        )

        if result.returncode == 0:
            print(f"调用成功: {content[:50]}...")
            return {
                'success': True,
                'output': result.stdout,
                'error': result.stderr
            }
        else:
            print(f"调用失败: {content[:50]}...")
            return {
                'success': False,
                'output': result.stdout,
                'error': result.stderr
            }

    except subprocess.TimeoutExpired:
        print(f"调用超时: {content[:50]}...")
        return {
            'success': False,
            'output': '',
            'error': 'Timeout'
        }
    except Exception as e:
        print(f"调用异常: {str(e)}")
        return {
            'success': False,
            'output': '',
            'error': str(e)
        }

def parse_bot_output(output):
    """解析bot输出，提取分段信息"""
    segments = []
    chat_id = None
    if not output:
        return segments, chat_id
    lines = output.split('\n')

    # 首先查找Chat ID
    for line in lines:
        if '🆔 Chat ID:' in line:
            chat_id_part = line.split('🆔 Chat ID:')[1].strip()
            if chat_id_part != '未获取到':
                chat_id = chat_id_part
            break

    # 查找并打印验证additional_messages内容
    print("\n🔍 从bot输出中提取验证信息:")
    verification_started = False
    for line in lines:
        if '🔍 验证additional_messages内容' in line or '验证additional_messages内容' in line:
            verification_started = True
            print(f"   {line.strip()}")
        elif verification_started and ('消息 ' in line and ('[user]' in line or '[assistant]' in line)):
            print(f"   {line.strip()}")
        elif verification_started and line.strip() and not line.startswith('发送流式请求数据') and not line.startswith('请求开始时间'):
            # 继续打印相关的验证信息，直到遇到其他部分
            if any(keyword in line for keyword in ['🎯 当前问题', '🔍 上下文内容', '📋 使用', '💬 使用简单模式']):
                print(f"   {line.strip()}")
            elif line.startswith('  ') and ('.' in line and '[' in line and ']' in line):
                # 打印消息列表格式的行，如 "  1. [user] 内容"
                print(f"   {line.strip()}")
            elif '发送流式请求数据' in line:
                # 遇到请求数据部分就停止
                break

    current_segment = None
    collecting_content = False
    content_lines = []
    
    for line in lines:
        if line.startswith('--- 分段'):
            if current_segment:
                # 保存之前收集的多行内容
                if content_lines:
                    # 将换行符替换为特殊标记，避免CSV格式问题
                    current_segment['block_result'] = '\\n'.join(content_lines)
                segments.append(current_segment)
                content_lines = []
                collecting_content = False
            current_segment = {
                'block_type': '',
                'block_subtype': '',
                'block_result': '',
                'block_start': 0.0,
                'block_end': 0.0
            }
        elif current_segment:
            if '消息类型:' in line:
                # 提取消息类型
                type_part = line.split('消息类型:')[1].strip()
                current_segment['block_type'] = type_part
                collecting_content = False
            elif '消息子类型:' in line:
                # 提取消息子类型
                subtype_part = line.split('消息子类型:')[1].strip()
                current_segment['block_subtype'] = subtype_part
                collecting_content = False
            elif '首token时间:' in line:
                # 提取首token时间
                time_part = line.split('首token时间:')[1].split('秒')[0].strip()
                try:
                    current_segment['block_start'] = float(time_part)
                except ValueError:
                    current_segment['block_start'] = 0.0
                collecting_content = False
            elif '结束时间:' in line:
                # 提取结束时间
                time_part = line.split('结束时间:')[1].split('秒')[0].strip()
                try:
                    current_segment['block_end'] = float(time_part)
                except ValueError:
                    current_segment['block_end'] = current_segment['block_start']
                collecting_content = False
            elif '内容:' in line and '无内容' not in line:
                # 开始收集内容（可能是多行）
                content_part = line.split('内容:')[1].strip()
                content_lines = [content_part] if content_part else []
                collecting_content = True
            elif collecting_content and line.strip() and not line.startswith('---'):
                # 继续收集多行内容，直到遇到下一个分段或结束
                content_lines.append(line)

    # 添加最后一个分段
    if current_segment:
        # 保存最后一个分段收集的多行内容
        if content_lines:
            # 将换行符替换为特殊标记，避免CSV格式问题
            current_segment['block_result'] = '\\n'.join(content_lines)
        segments.append(current_segment)

    return segments, chat_id

def parse_context_data(context_str):
    """解析上下文数据，支持多种格式"""
    if not context_str or pd.isna(context_str):
        return None
    
    context_str = str(context_str).strip()
    if not context_str:
        return None
    
    try:
        # 尝试1: 解析为JSON数组 [{"role":"user",...},{"role":"assistant",...}]
        context_messages = json.loads(context_str)
        if isinstance(context_messages, list):
            print(f"✅ 成功解析JSON数组格式: {len(context_messages)} 条消息")
            return context_messages
    except json.JSONDecodeError:
        pass
    
    try:
        # 尝试2: 解析逗号分隔的JSON对象 {"role":"user",...},{"role":"assistant",...}
        # 添加方括号使其成为有效的JSON数组
        if not context_str.startswith('[') and '},{' in context_str:
            fixed_context = '[' + context_str + ']'
            context_messages = json.loads(fixed_context)
            print(f"✅ 成功解析逗号分隔JSON格式: {len(context_messages)} 条消息")
            return context_messages
    except json.JSONDecodeError:
        pass
    
    try:
        # 尝试3: 按行解析JSONL格式
        lines = context_str.strip().split('\n')
        context_messages = []
        for line in lines:
            line = line.strip()
            if line:
                context_messages.append(json.loads(line))
        if context_messages:
            print(f"✅ 成功解析JSONL格式: {len(context_messages)} 条消息")
            return context_messages
    except json.JSONDecodeError:
        pass
    
    print(f"❌ 上下文解析失败，无法识别格式: {context_str[:100]}...")
    return None

def process_single_row(row_data, output_file):
    """处理单行数据的函数（用于并发处理）"""
    idx, row = row_data
    question_id = str(row['question_id'])
    question_type = str(row['question_type'])
    question_text = str(row['question_text'])
    
    # 检查是否有context列
    context_data = None
    context_str = ""
    if 'context' in row:
        raw_context = str(row['context']) if pd.notna(row['context']) else ""
        if raw_context and raw_context != 'nan':
            # 解析context数据
            context_data = parse_context_data(raw_context)
            # 将解析后的数据转换为标准JSON数组格式存储
            if context_data:
                context_str = json.dumps(context_data, ensure_ascii=False)
            else:
                context_str = ""
        else:
            context_str = ""

    print(f"📝 处理第 {idx+1} 行: {question_id}")
    print(f"   问题类型: {question_type}")
    print(f"   问题内容: {question_text[:100]}{'...' if len(question_text) > 100 else ''}")
    if context_data:
        print(f"   📚 上下文: {len(context_data)} 条历史消息")

    # 调用bot
    result = call_coze_bot(question_text, context_data)

    records_count = 0
    if result['success'] and result['output']:
        # 解析bot输出
        segments, chat_id = parse_bot_output(result['output'])

        print(f"   ✅ 成功解析出 {len(segments)} 个分段")
        if chat_id:
            print(f"   🆔 Chat ID: {chat_id}")
        else:
            print(f"   ⚠️ 未找到Chat ID")
        
        # 为每个分段创建记录并增量写入
        for i, segment in enumerate(segments):
            if segment['block_type'] and segment['block_type'] != 'unknown':  # 只添加有意义的记录，忽略unknown类型
                record = {
                    'question_id': question_id,
                    'question_type': question_type,
                    'question_text': question_text,
                    'context': context_str,  # 添加context列
                    'chatid': chat_id or '',  # 添加chatid列
                    'block_type': segment['block_type'],
                    'block_subtype': segment.get('block_subtype', ''),
                    'block_result': segment['block_result'],
                    'block_start': segment['block_start'],
                    'block_end': segment.get('block_end', 0.0) or segment['block_start']  # 如果结束时间为0，使用开始时间
                }

                # 增量写入文件
                record_df = pd.DataFrame([record])
                record_df.to_csv(output_file, mode='a', header=False, index=False, encoding='utf-8-sig', 
                                quoting=1, escapechar='\\')  # 使用适当的引用和转义
                records_count += 1
    else:
        print(f"   ❌ 跳过失败的行: {question_id} - 输出为空或调用失败")
        if result.get('error'):
            print(f"   🔴 错误信息: {result['error']}")

    return records_count

def read_data_file(file_path):
    """读取数据文件（支持CSV和Excel格式）"""
    print(f"开始处理文件: {file_path}")

    file_ext = os.path.splitext(file_path)[1].lower()
    df = None

    if file_ext in ['.xls', '.xlsx']:
        # 读取Excel文件
        try:
            if file_ext == '.xls':
                # 对于.xls文件，使用xlrd引擎
                if not HAS_XLRD:
                    print("需要安装 xlrd 来读取 .xls 文件")
                    print("安装命令: pip install xlrd")
                    return None
                df = pd.read_excel(file_path, engine='xlrd')
            else:
                # 对于.xlsx文件，使用openpyxl引擎
                if not HAS_OPENPYXL:
                    print("需要安装 openpyxl 来读取 .xlsx 文件")
                    print("安装命令: pip install openpyxl")
                    return None
                df = pd.read_excel(file_path, engine='openpyxl')
            print(f"成功读取Excel文件")
        except Exception as e:
            print(f"读取Excel文件失败: {e}")
            return None

    elif file_ext == '.csv':
        # 读取CSV文件，支持多种编码
        encodings_to_try = ['utf-8', 'gbk', 'gb2312', 'cp936', 'utf-8-sig', 'latin1']

        for encoding in encodings_to_try:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                print(f"成功使用编码 {encoding} 读取CSV文件")
                break
            except UnicodeDecodeError:
                continue
            except Exception as e:
                print(f"使用编码 {encoding} 时出错: {e}")
                continue

        if df is None:
            print("无法读取CSV文件")
            return None
    else:
        print(f"不支持的文件格式: {file_ext}")
        print("支持的格式: .csv, .xls, .xlsx")
        return None

    # 验证数据
    if len(df) == 0:
        print("文件为空")
        return None

    print(f"数据集大小: {len(df)} 行")
    print(f"列名: {list(df.columns)}")

    # 验证必要的列是否存在
    required_columns = ['question_id', 'question_type', 'question_text']
    missing_columns = [col for col in required_columns if col not in df.columns]

    if missing_columns:
        print(f"缺少必要的列: {missing_columns}")
        return None

    # 检查是否有context列
    has_context = 'context' in df.columns
    if has_context:
        print("✅ 检测到context列，将使用上下文模式")
    else:
        print("💬 未检测到context列，将使用简单模式")

    # 打印样例数据
    print("样例数据:")
    sample_row = df.iloc[0]
    for col in required_columns:
        sample_text = str(sample_row[col])
        print(f"  {col}: {sample_text[:50]}{'...' if len(sample_text) > 50 else ''}")
    
    # 如果有context列，也显示样例
    if has_context and pd.notna(sample_row.get('context')):
        context_text = str(sample_row['context'])
        print(f"  context: {context_text[:100]}{'...' if len(context_text) > 100 else ''}")

    return df

def process_csv_data(data_file, output_file):
    """处理数据文件"""
    df = read_data_file(data_file)
    if df is None:
        return

    # 创建结果表格头文件
    result_df = pd.DataFrame(columns=[
        'question_id', 'question_type', 'question_text', 'context', 'chatid',
        'block_type', 'block_subtype', 'block_result',
        'block_start', 'block_end'
    ])

    # 检查输出文件是否存在，如果不存在创建并写入表头
    if not os.path.exists(output_file):
        result_df.to_csv(output_file, index=False, encoding='utf-8-sig', 
                        quoting=1, escapechar='\\')

    # 从环境变量读取线程数配置，默认为5
    max_workers = int(os.getenv('DATA_PROCESSOR_THREADS', 5))
    print(f"开始并发处理数据（{max_workers}个线程）...")
    print(f"📊 配置信息: 最大并发线程数 = {max_workers}")

    # 使用 ThreadPoolExecutor 并发处理
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # 准备任务列表
        tasks = [(idx, row) for idx, row in df.iterrows()]

        # 提交任务并收集结果
        future_to_task = {executor.submit(process_single_row, task, output_file): task[0] for task in tasks}

        total_processed = 0
        total_records = 0

        # 等待所有任务完成
        for future in concurrent.futures.as_completed(future_to_task):
            task_idx = future_to_task[future]
            try:
                records_count = future.result()
                total_records += records_count
            except Exception as exc:
                print(f'处理第 {task_idx+1} 行时发生异常: {exc}')

            total_processed += 1

            # 每处理1行显示一次进度
            print(f"进度: {total_processed}/{len(df)} 行已处理，已生成 {total_records} 条记录")
            
            # 每处理5行显示更详细的进度
            if total_processed % 5 == 0:
                completion_rate = (total_processed / len(df)) * 100
                print(f"🚀 完成率: {completion_rate:.1f}% ({total_processed}/{len(df)})")

    print(f"结果已增量保存到: {output_file}")
    print(f"总共处理了 {len(df)} 行数据")
    print(f"生成了 {total_records} 条记录")
    print(f"并发线程数: {max_workers}")

def main():
    # 检查命令行参数
    if len(sys.argv) > 1:
        input_csv = sys.argv[1]
        print(f"使用指定的输入文件: {input_csv}")

    # 确保data目录存在
    os.makedirs('data', exist_ok=True)
    output_csv = f"data/results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    print("=" * 60)
    print("Coze Bot 数据集处理程序")
    print("=" * 60)

    # 检查输入文件是否存在
    if not os.path.exists(input_csv):
        print(f"输入文件不存在: {input_csv}")
        sys.exit(1)

    # 处理数据
    process_csv_data(input_csv, output_csv)

    print("\n" + "=" * 60)
    print("处理完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()