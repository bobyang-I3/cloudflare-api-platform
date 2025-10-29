#!/usr/bin/env python3
"""
测试用户限额功能
"""
import requests
import time

BASE_URL = "http://localhost:8000"

# Test用户的API Key (bob.yang@intelligencecubed.com)
TEST_API_KEY = "cb_ae3f7e0d23f747cd956f30ac5a46bb7d"

def test_quota_check():
    """测试配额查询"""
    print("🔍 测试1: 查询用户配额")
    print("=" * 60)
    
    headers = {
        "Authorization": f"Bearer YOUR_JWT_TOKEN",  # 需要JWT token
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/api/usage/quota", headers=headers)
        if response.status_code == 200:
            quota = response.json()
            print("✅ 配额信息:")
            print(f"   无限制: {quota.get('unlimited', False)}")
            if not quota.get('unlimited'):
                print(f"   剩余请求数: {quota.get('requests_remaining', 'N/A')}")
                print(f"   剩余每日tokens: {quota.get('daily_tokens_remaining', 'N/A')}")
                print(f"   剩余每月tokens: {quota.get('monthly_tokens_remaining', 'N/A')}")
        else:
            print(f"❌ 查询失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 错误: {e}")
    
    print()

def test_limit_enforcement():
    """测试限额强制执行"""
    print("🧪 测试2: 限额强制执行")
    print("=" * 60)
    print("⚠️ 请先在 Admin 面板设置 bob.yang 的限额")
    print("   例如: 每天最多 5 个请求")
    print()
    
    headers = {
        "X-API-Key": TEST_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "messages": [{"role": "user", "content": "hi"}],
        "model": "@cf/meta/llama-3.1-8b-instruct",
        "max_tokens": 10
    }
    
    # 发送多个请求直到触发限额
    for i in range(1, 11):
        print(f"📤 发送请求 #{i}...", end=" ")
        try:
            response = requests.post(
                f"{BASE_URL}/api/ai/chat",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                print("✅ 成功")
            elif response.status_code == 429:
                print("⛔ 限额已达!")
                error = response.json()
                print(f"\n📋 错误详情:")
                print(f"   {error.get('detail', '未知错误')}")
                print(f"\n🎯 限额检查生效！测试成功！")
                break
            else:
                print(f"❌ 失败 ({response.status_code})")
                print(f"   {response.text}")
                break
                
        except Exception as e:
            print(f"❌ 异常: {e}")
            break
        
        time.sleep(0.5)  # 避免请求过快
    else:
        print("\n⚠️ 发送了10个请求都没触发限额")
        print("   请检查 Admin 面板是否正确设置了限额")
    
    print()

def test_admin_bypass():
    """测试管理员绕过限额"""
    print("🧪 测试3: 管理员账户绕过限额")
    print("=" * 60)
    
    # Admin 的 API key
    ADMIN_API_KEY = "cb_8ec574bf46f4456d80e9f4d5e2ea29c3"
    
    headers = {
        "X-API-Key": ADMIN_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "messages": [{"role": "user", "content": "test"}],
        "model": "@cf/meta/llama-3.1-8b-instruct",
        "max_tokens": 10
    }
    
    print("📤 使用 Admin API Key 发送请求...", end=" ")
    try:
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ 成功!")
            print("   ✓ Admin 用户不受限额限制")
        else:
            print(f"❌ 失败 ({response.status_code})")
            
    except Exception as e:
        print(f"❌ 异常: {e}")
    
    print()

if __name__ == "__main__":
    print()
    print("=" * 60)
    print("🔬 用户限额功能测试")
    print("=" * 60)
    print()
    print("📝 测试前准备:")
    print("   1. 确保后端正在运行")
    print("   2. 登录 Admin 账户 (admin / admin123)")
    print("   3. 进入 Admin 面板")
    print("   4. 找到 bob.yang@intelligencecubed.com")
    print("   5. 设置限额: 每天最多 5 个请求")
    print("   6. 勾选 'Enable Limits' 并保存")
    print()
    input("准备好后按 Enter 继续...")
    print()
    
    # test_quota_check()  # 需要JWT token，跳过
    test_limit_enforcement()
    test_admin_bypass()
    
    print("=" * 60)
    print("✅ 测试完成!")
    print("=" * 60)
    print()
    print("💡 关键功能:")
    print("   ✓ 普通用户受限额限制")
    print("   ✓ 超过限额返回 429 错误")
    print("   ✓ Admin 用户不受限额限制")
    print("   ✓ 限额每天UTC午夜重置")
    print()

