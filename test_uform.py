#!/usr/bin/env python3
"""
测试 UForm-Gen2 图像识别模型
"""
import requests
import base64
from PIL import Image
import io

# 配置
API_KEY = "cb_ae3f7e0d23f747cd956f30ac5a46bb7d"
BASE_URL = "http://localhost:8000"

def create_test_image():
    """创建一个简单的测试图像"""
    # 创建一个200x200的彩色图像（蓝色背景）
    img = Image.new('RGB', (200, 200), color=(73, 109, 137))
    
    # 转换为JPEG base64
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG", quality=85)
    img_bytes = buffered.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    
    return img_base64, len(img_bytes)

def test_uform():
    """测试 UForm-Gen2 模型"""
    print("🧪 测试 UForm-Gen2 Qwen 500M")
    print("=" * 60)
    
    # 创建测试图像
    img_base64, img_size = create_test_image()
    print(f"📸 测试图像: 200x200 蓝色背景, {img_size} bytes")
    print()
    
    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "What colors do you see in this image?",
                "image": f"data:image/jpeg;base64,{img_base64}"
            }
        ],
        "model": "@cf/unum/uform-gen2-qwen-500m",
        "max_tokens": 150
    }
    
    print("⏳ 发送请求...")
    start_time = __import__('time').time()
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json=payload,
            timeout=30  # UForm应该更快
        )
        
        elapsed = __import__('time').time() - start_time
        
        print(f"⏱️  响应时间: {elapsed:.2f} 秒")
        print(f"📊 HTTP状态: {response.status_code}")
        print()
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 成功!")
            print("-" * 60)
            print(f"🤖 AI回复:")
            print(result['response'])
            print("-" * 60)
            print(f"🔢 Token统计:")
            print(f"   输入: {result['input_tokens']}")
            print(f"   输出: {result['output_tokens']}")
            print(f"   总计: {result['total_tokens']}")
            print()
            print("🎉 图像识别功能正常工作!")
        else:
            print(f"❌ 失败!")
            print("-" * 60)
            print(response.text)
            print("-" * 60)
            
    except requests.Timeout:
        print("❌ 请求超时（30秒）")
    except Exception as e:
        print(f"❌ 异常: {type(e).__name__}: {e}")

if __name__ == "__main__":
    print()
    test_uform()
    print()
    print("=" * 60)
    print("💡 提示: 如果成功，前端的图像上传功能应该也能正常工作了！")
    print("=" * 60)

