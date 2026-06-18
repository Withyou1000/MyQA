# 预留精排入口，后续可以在这里接入 CrossEncoder 等模型对召回结果重新排序。
def rerank_results(query: str, results: list[dict]) -> list[dict]:
    return results
