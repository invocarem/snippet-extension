// Converted from Chai to Jest
import {
  HarmonyParser,
  ParsedHarmonyMessage,
} from "../src/utils/HarmonyParser";

describe("HarmonyParser", () => {
  describe("parse", () => {
    it("should parse a simple Harmony protocol message", () => {
      const input =
        "<|start|>assistant<|channel|>final<|message|>Hello! I'm here to help.<|end|>";
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).toBe("Hello! I'm here to help.");
      expect(result.channels).toEqual(["final"]);
      expect(result.metadata).toEqual({});
    });

    it("should handle multiple chained messages", () => {
      const input =
        "<|start|>assistant<|channel|>reasoning<|message|>Thinking about the response...<|end|><|start|>assistant<|channel|>final<|message|>Hello! What can I help with?<|end|>";
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).toBe("Hello! What can I help with?");
      expect(result.channels).toEqual(["reasoning", "final"]);
      expect(result.metadata).toEqual({});
    });

    it("should handle nested or complex messages", () => {
      const input =
        "<|start|>assistant<|channel|>final<|message|>Hello! I'm here to help with prototyping.<|assistant|>assistant<|final|>What can I assist you with?<|end|>";
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).toBe(
        "Hello! I'm here to help with prototyping. What can I assist you with?"
      );
      expect(result.channels).toEqual(["final"]);
      expect(result.metadata).toEqual({});
    });

    it("should return input as-is if no Harmony tags are present", () => {
      const input = "This is a plain text message.";
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).toBe("This is a plain text message.");
      expect(result.channels).toEqual([]);
      expect(result.metadata).toEqual({});
    });

    it("should handle malformed input gracefully", () => {
      const input =
        "<|start|>assistant<|channel|>final<|message|>Hello!<|end|>"; // Missing closing tags properly
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).toBe("Hello!");
      expect(result.channels).toEqual(["final"]);
    });

    it("should extract metadata from unknown tags", () => {
      const input =
        "<|start|>assistant<|channel|>final<|custom|>some value<|message|>Hello!<|end|>";
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).toBe("Hello!");
      expect(result.metadata).toEqual({
        custom: "some value",
      });
    });
  });
});
