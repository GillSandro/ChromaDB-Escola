FROM chromadb/chroma:latest

EXPOSE 8000

CMD ["sh", "-c", "chroma run --host 0.0.0.0 --port $PORT"]
