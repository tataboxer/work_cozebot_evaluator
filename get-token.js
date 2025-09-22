const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 从环境变量读取配置，如果没有则使用默认值
const LOGIN_HOST = process.env.LOGIN_HOST || '172.16.8.8';
const LOGIN_PATH = process.env.LOGIN_PATH || '/infra-auth/api/noauth/v2/login';

// 登录接口URL
const LOGIN_URL = `https://${LOGIN_HOST}${LOGIN_PATH}`;

// 请求体数据 - 从环境变量读取，如果没有则使用默认值
const requestData = {
  "device": process.env.LOGIN_DEVICE ,
  "username": process.env.LOGIN_USERNAME ,
  "password": process.env.LOGIN_PASSWORD 
};

// 准备HTTPS请求选项
const options = {
  hostname: LOGIN_HOST,
  path: LOGIN_PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('='.repeat(60));
console.log('🧪 登录接口');
console.log('='.repeat(60));


// 创建HTTPS请求
const req = https.request(options, (res) => {
  console.log(`\n响应状态码: ${res.statusCode}`);
  console.log('响应头:', res.headers);

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n=== 原始响应数据 ===');
    console.log(data);
    
    try {
      const jsonResponse = JSON.parse(data);
      console.log('\n=== 解析后的JSON响应 ===');
      console.log(JSON.stringify(jsonResponse, null, 2));
      
      if (res.statusCode === 200) {
        console.log('\n✅ 登录测试成功！');
        // 提取并显示令牌信息
        if (jsonResponse.items && jsonResponse.items.token) {

          // 输出Token信息（不再写入.env文件）
          console.log('🔑 访问令牌:', `Bearer ${jsonResponse.items.token}`);
          if (jsonResponse.items.refreshToken) {
            console.log('🔄 刷新令牌:', jsonResponse.items.refreshToken);
          }
          console.log('✅ Token获取成功！');
        }
      } else {
        console.log('\n❌ 登录失败:');
        console.log('状态码:', res.statusCode);
        console.log('错误信息:', jsonResponse.message || '未知错误');
        process.exit(1);
      }
    } catch (error) {
      console.log('\n❌ JSON解析失败:', error.message);
      console.log('原始数据:', data);
      process.exit(1);
    }
  });
});

// 设置8秒超时
req.setTimeout(8000, () => {
  console.error('❌ 请求超时(8秒)，可能是内网连接问题');
  req.destroy();
  process.exit(1);
});

// 处理请求错误
req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
  process.exit(1);
});

// 发送请求数据
req.write(JSON.stringify(requestData));
req.end();

console.log('\n🚀 已发送登录请求，请等待响应...');