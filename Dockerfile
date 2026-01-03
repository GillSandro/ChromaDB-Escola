FROM chromadb/chroma:0.4.0

EXPOSE 8000

CMD ["uvicorn", "chromadb.app:app", "--host", "0.0.0.0", "--port", "8000"]
