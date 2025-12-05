# Ollama Setup Guide

This application uses **Ollama** - a free, open-source tool that runs large language models locally on your machine. No API keys, no costs, completely free!

## Quick Start

### 1. Install Ollama

**macOS:**
```bash
brew install ollama
# Or download from https://ollama.ai
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
- Download the installer from https://ollama.ai
- Run the installer

### 2. Pull a Model

After installation, download a model:

```bash
# Recommended: llama3.2 (good balance of quality and speed)
ollama pull llama3.2

# Alternative models:
ollama pull mistral      # Fast and efficient
ollama pull llama3       # Larger, more capable
ollama pull qwen2.5      # Good for structured data
ollama pull phi3         # Small and fast
```

### 3. Verify Installation

```bash
# List installed models
ollama list

# Test the model
ollama run llama3.2 "Hello, how are you?"
```

### 4. Start Ollama (if needed)

Ollama usually runs automatically, but if you need to start it manually:

```bash
ollama serve
```

The API will be available at `http://localhost:11434`

### 5. Configure the Application

In your `backend/.env` file:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

## Model Recommendations

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **llama3.2** | ~2GB | Fast | Good | **Recommended** - Best balance |
| mistral | ~4GB | Fast | Very Good | Fast responses |
| llama3 | ~4.7GB | Medium | Excellent | Best quality |
| qwen2.5 | ~1.5GB | Very Fast | Good | Structured data extraction |
| phi3 | ~2.3GB | Very Fast | Good | Resource-constrained systems |

## Troubleshooting

### Ollama not connecting

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

### Model not found

```bash
# List installed models
ollama list

# Pull the model if missing
ollama pull llama3.2
```

### Slow responses

- Try a smaller model (qwen2.5, phi3)
- Ensure you have enough RAM (models need 4-8GB free)
- Close other applications

### Out of memory

- Use a smaller model
- Close other applications
- Consider upgrading RAM

## Performance Tips

1. **First request is slow** - Models load into memory on first use
2. **Subsequent requests are faster** - Model stays in memory
3. **RAM matters** - More RAM = can use larger models
4. **GPU acceleration** - Ollama automatically uses GPU if available (much faster!)

## Advantages of Ollama

✅ **Completely Free** - No API costs, no usage limits  
✅ **Privacy** - All data stays on your machine  
✅ **No Internet Required** - Works offline  
✅ **No API Keys** - Simple setup  
✅ **Fast** - Local processing, no network latency  
✅ **Customizable** - Choose the model that fits your needs  

## Resources

- Official Website: https://ollama.ai
- Model Library: https://ollama.ai/library
- Documentation: https://github.com/ollama/ollama

