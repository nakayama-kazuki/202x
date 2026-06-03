from deepeval.models import DeepEvalBaseLLM

class DebugLLM(DeepEvalBaseLLM):
    def get_model_name(in_self):
        return 'debug'
    def load_model(in_self):
        return None
    def generate(in_self, in_prompt, in_schema=None):
        print(in_prompt)
        return '{"score": 1.0, "reason": "debug response"}'
    async def a_generate(in_self, in_prompt, in_schema=None):
        return in_self.generate(in_prompt, in_schema)

def create():
    return DebugLLM()
