#!/usr/bin/env python3
"""
测试图像上传功能
"""
import requests
import base64
import json
from pathlib import Path

# 配置
API_KEY = "cb_ae3f7e0d23f747cd956f30ac5a46bb7d"  # test用户的API Key
BASE_URL = "http://localhost:8000"

def test_text_chat():
    """测试普通文本聊天"""
    print("🧪 测试1: 普通文本聊天 (Llama 3.1)")
    print("-" * 50)
    
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "messages": [
            {"role": "user", "content": "Say hello in Chinese"}
        ],
        "model": "@cf/meta/llama-3.1-8b-instruct",
        "max_tokens": 50
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 成功!")
            print(f"📝 回复: {result['response'][:100]}...")
            print(f"🔢 Tokens: {result['total_tokens']}")
        else:
            print(f"❌ 失败: {response.status_code}")
            print(f"错误: {response.text}")
    except Exception as e:
        print(f"❌ 异常: {e}")
    
    print()

def test_vision_chat():
    """测试图像聊天"""
    print("🧪 测试2: 图像聊天 (LLaVA)")
    print("-" * 50)
    
    # 创建一个简单的测试图像（1x1像素PNG）
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "Describe this image",
                "image": f"data:image/png;base64,{test_image_base64}"
            }
        ],
        "model": "@cf/llava-hf/llava-1.5-7b-hf",
        "max_tokens": 100
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json=payload,
            timeout=60  # 图像处理需要更长时间
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 成功!")
            print(f"📝 回复: {result['response'][:200]}...")
            print(f"🔢 Tokens: {result['total_tokens']}")
        else:
            print(f"❌ 失败: {response.status_code}")
            print(f"错误: {response.text}")
            print(f"\n📋 发送的数据:")
            print(json.dumps(payload, indent=2)[:500] + "...")
    except Exception as e:
        print(f"❌ 异常: {e}")
    
    print()

def test_models_list():
    """测试模型列表"""
    print("🧪 测试3: 获取模型列表")
    print("-" * 50)
    
    try:
        response = requests.get(f"{BASE_URL}/api/ai/models", timeout=10)
        
        if response.status_code == 200:
            models = response.json()
            print(f"✅ 成功! 共 {len(models)} 个模型")
            print("\n可用模型:")
            for i, model in enumerate(models, 1):
                print(f"  {i}. [{model['task']:20s}] {model['name']}")
        else:
            print(f"❌ 失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 异常: {e}")
    
    print()

if __name__ == "__main__":
    print("=" * 50)
    print("🔬 Cloudflare API 功能测试")
    print("=" * 50)
    print()
    
    test_models_list()
    test_text_chat()
    test_vision_chat()
    
    print("=" * 50)
    print("✅ 测试完成!")
    print("=" * 50)


