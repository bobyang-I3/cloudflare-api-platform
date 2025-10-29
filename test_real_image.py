#!/usr/bin/env python3
"""
用真实图像测试LLaVA
"""
import requests
import base64
from PIL import Image
import io

# 配置
API_KEY = "cb_ae3f7e0d23f747cd956f30ac5a46bb7d"
BASE_URL = "http://localhost:8000"

def create_test_image():
    """创建一个简单的测试图像（200x200，带文字）"""
    # 创建一个彩色图像
    img = Image.new('RGB', (200, 200), color=(73, 109, 137))
    
    # 将图像转换为base64
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG", quality=85)
    img_bytes = buffered.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    
    return img_base64, len(img_bytes)

def test_vision_with_real_image():
    """测试图像聊天（真实图像）"""
    print("🧪 测试: LLaVA with 200x200 JPEG")
    print("-" * 60)
    
    # 创建测试图像
    img_base64, img_size = create_test_image()
    print(f"📸 图像大小: {img_size} bytes")
    print(f"📝 Base64长度: {len(img_base64)} characters")
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
        "model": "@cf/llava-hf/llava-1.5-7b-hf",
        "max_tokens": 150
    }
    
    print("⏳ 发送请求到Cloudflare...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/ai/chat",
            headers=headers,
            json=payload,
            timeout=90
        )
        
        print(f"📊 HTTP状态码: {response.status_code}")
        print()
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 成功!")
            print("-" * 60)
            print(f"📝 AI回复:")
            print(result['response'])
            print("-" * 60)
            print(f"🔢 Tokens: input={result['input_tokens']}, output={result['output_tokens']}, total={result['total_tokens']}")
        else:
            print(f"❌ 失败!")
            print("-" * 60)
            print(f"错误内容:")
            print(response.text)
            print("-" * 60)
            
            # 尝试解析错误
            try:
                error_json = response.json()
                if 'detail' in error_json:
                    print(f"\n🔍 详细错误: {error_json['detail']}")
            except:
                pass
                
    except requests.Timeout:
        print("❌ 请求超时! LLaVA处理图像可能需要更长时间。")
    except Exception as e:
        print(f"❌ 异常: {type(e).__name__}: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("🔬 LLaVA 真实图像测试")
    print("=" * 60)
    print()
    
    test_vision_with_real_image()
    
    print()
    print("=" * 60)
    print("提示:")
    print("  1. 如果成功 → 前端应该也能工作")
    print("  2. 如果失败 → 可能是Cloudflare API限制")
    print("=" * 60)


