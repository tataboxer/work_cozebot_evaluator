const https = require('https');

class TokenManager {
    constructor() {
        this.currentToken = null;
        this.tokenExpiry = null;
    }

    async getToken() {
        // 如果有有效的Token且未过期，直接返回
        if (this.currentToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.currentToken;
        }

        // 获取新Token
        return await this.fetchNewToken();
    }

    async fetchNewToken() {
        return new Promise((resolve, reject) => {
            const LOGIN_HOST = process.env.LOGIN_HOST || '172.16.8.8';
            const LOGIN_PATH = process.env.LOGIN_PATH || '/infra-auth/api/noauth/v2/login';

            // 检查必要的环境变量
            if (!process.env.LOGIN_DEVICE || !process.env.LOGIN_USERNAME || !process.env.LOGIN_PASSWORD) {
                const missing = [];
                if (!process.env.LOGIN_DEVICE) missing.push('LOGIN_DEVICE');
                if (!process.env.LOGIN_USERNAME) missing.push('LOGIN_USERNAME');
                if (!process.env.LOGIN_PASSWORD) missing.push('LOGIN_PASSWORD');
                
                console.error('❌ 缺少必要的环境变量:', missing.join(', '));
                reject(new Error(`缺少必要的环境变量: ${missing.join(', ')}`));
                return;
            }

            const requestData = {
                "device": process.env.LOGIN_DEVICE,
                "username": process.env.LOGIN_USERNAME,
                "password": process.env.LOGIN_PASSWORD
            };
            
            console.log('🔑 尝试获取Token:', {
                host: LOGIN_HOST,
                path: LOGIN_PATH,
                device: process.env.LOGIN_DEVICE ? '✅ 已设置' : '❌ 未设置'
            });

            const options = {
                hostname: LOGIN_HOST,
                path: LOGIN_PATH,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const jsonResponse = JSON.parse(data);

                        if (res.statusCode === 200 && jsonResponse.items && jsonResponse.items.token) {
                            const token = `Bearer ${jsonResponse.items.token}`;
                            
                            // 缓存Token，设置过期时间（假设Token有效期为1小时）
                            this.currentToken = token;
                            this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1小时后过期
                            
                            console.log('🔑 Token获取成功');
                            resolve(token);
                        } else {
                            reject(new Error(`登录失败: ${jsonResponse.message || '未知错误'}`));
                        }
                    } catch (error) {
                        reject(new Error(`JSON解析失败: ${error.message}`));
                    }
                });
            });

            // 设置8秒超时
            req.setTimeout(8000, () => {
                req.destroy();
                reject(new Error('请求超时(8秒)'));
            });

            req.on('error', (error) => {
                reject(new Error(`请求失败: ${error.message}`));
            });

            req.write(JSON.stringify(requestData));
            req.end();
        });
    }

    // 清除缓存的Token（强制重新获取）
    clearToken() {
        this.currentToken = null;
        this.tokenExpiry = null;
    }
}

module.exports = new TokenManager();