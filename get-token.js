const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 登录接口URL
const LOGIN_URL = 'http://172.16.8.8/infra-auth/api/noauth/v2/login';

// 请求体数据 - 从环境变量读取，如果没有则使用默认值
const requestData = {
  "device": process.env.LOGIN_DEVICE ,
  "username": process.env.LOGIN_USERNAME ,
  "password": process.env.LOGIN_PASSWORD 
};

// 准备HTTP请求选项
const options = {
  hostname: '172.16.8.8',
  port: 80,
  path: '/infra-auth/api/noauth/v2/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('='.repeat(60));
console.log('🧪 登录接口测试');
console.log('='.repeat(60));
console.log('请求URL:', LOGIN_URL);
console.log('请求体数据:', JSON.stringify(requestData, null, 2));

// 创建HTTP请求
const req = http.request(options, (res) => {
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
          console.log('🔑 访问令牌:', jsonResponse.items.token);

          // 将token写入.env文件
          const envPath = path.join(__dirname, '.env');
          let envContent = `ACCESS_TOKEN=Bearer ${jsonResponse.items.token}\n`;

          if (jsonResponse.items.refreshToken) {
            envContent += `REFRESH_TOKEN=${jsonResponse.items.refreshToken}\n`;
            console.log('🔄 刷新令牌:', jsonResponse.items.refreshToken);
          }

          try {
            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log('💾 Token已保存到 .env 文件');
          } catch (error) {
            console.error('❌ 保存.env文件失败:', error.message);
          }
        }
      } else {
        console.log('\n❌ 登录测试失败:');
        console.log('状态码:', res.statusCode);
        console.log('错误信息:', jsonResponse.message || '未知错误');
      }
    } catch (error) {
      console.log('\n❌ JSON解析失败:', error.message);
      console.log('原始数据:', data);
    }
  });
});

// 处理请求错误
req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
  console.error('错误详情:', error);
});

// 发送请求数据
req.write(JSON.stringify(requestData));
req.end();

console.log('\n🚀 已发送登录请求，请等待响应...');