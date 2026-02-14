import { expect } from "chai";
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

      expect(result.finalMessage).to.equal("Hello! I'm here to help.");
      expect(result.channels).to.eql(["final"]);
      expect(result.metadata).to.eql({});
    });

    it("should handle multiple chained messages", () => {
      const input =
        "<|start|>assistant<|channel|>reasoning<|message|>Thinking about the response...<|end|><|start|>assistant<|channel|>final<|message|>Hello! What can I help with?<|end|>";
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).to.equal("Hello! What can I help with?");
      expect(result.channels).to.eql(["reasoning", "final"]);
      expect(result.metadata).to.eql({});
    });

    it("should handle nested or complex messages", () => {
      const input =
        "<|start|>assistant<|channel|>final<|message|>Hello! I'm here to help with prototyping.<|assistant|>assistant<|final|>What can I assist you with?<|end|>";
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).to.equal(
        "Hello! I'm here to help with prototyping. What can I assist you with?"
      );
      expect(result.channels).to.eql(["final"]);
      expect(result.metadata).to.eql({});
    });

    it("should return input as-is if no Harmony tags are present", () => {
      const input = "This is a plain text message.";
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).to.equal("This is a plain text message.");
      expect(result.channels).to.eql([]);
      expect(result.metadata).to.eql({});
    });

    it("should handle malformed input gracefully", () => {
      const input =
        "<|start|>assistant<|channel|>final<|message|>Hello!<|end|>"; // Missing closing tags properly
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).to.equal("Hello!");
      expect(result.channels).to.eql(["final"]);
    });

    it("should extract metadata from unknown tags", () => {
      const input =
        "<|start|>assistant<|channel|>final<|custom|>some value<|message|>Hello!<|end|>";
      const result: ParsedHarmonyMessage = HarmonyParser.parse(input);

      expect(result.finalMessage).to.equal("Hello!");
      expect(result.metadata).to.eql({
        custom: "some value",
      });
    });
  });
});
