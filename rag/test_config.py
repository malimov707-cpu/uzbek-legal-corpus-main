import importlib
import os
import unittest
from unittest.mock import patch

import config


class InferenceConfigurationTests(unittest.TestCase):
    def load_with(self, values):
        names = (
            "OPENROUTER_API_KEY",
            "OPENROUTER_MODEL",
            "VLLM_BASE",
            "VLLM_MODEL",
        )
        saved = {name: os.environ.get(name) for name in names}
        try:
            for name in names:
                os.environ.pop(name, None)
            os.environ.update(values)
            importlib.reload(config)
            return config.VLLM_BASE, config.VLLM_MODEL, config.VLLM_KEY
        finally:
            for name, value in saved.items():
                if value is None:
                    os.environ.pop(name, None)
                else:
                    os.environ[name] = value
            importlib.reload(config)

    def test_openrouter_settings_select_openrouter_as_default(self):
        base, model, key = self.load_with({
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_MODEL": "provider/model",
        })
        self.assertEqual(base, "https://openrouter.ai/api/v1")
        self.assertEqual(model, "provider/model")
        self.assertEqual(key, "test-key")

    def test_explicit_vllm_settings_take_precedence(self):
        base, model, key = self.load_with({
            "OPENROUTER_API_KEY": "test-key",
            "OPENROUTER_MODEL": "provider/model",
            "VLLM_BASE": "http://127.0.0.1:8001/v1",
            "VLLM_MODEL": "local-adapter",
        })
        self.assertEqual(base, "http://127.0.0.1:8001/v1")
        self.assertEqual(model, "local-adapter")
        self.assertEqual(key, "test-key")


if __name__ == "__main__":
    unittest.main()
