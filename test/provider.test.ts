import { expect } from "chai";
import * as sinon from "sinon";
import { LlamaClient } from "../src/api/llamaClient";

describe("SnippetViewProvider Integration", () => {
  let mockLlamaClient: sinon.SinonStubbedInstance<LlamaClient>;

  beforeEach(() => {
    mockLlamaClient = sinon.createStubInstance(LlamaClient);
    // Manually stub the methods since createStubInstance doesn't do it automatically
    mockLlamaClient.complete = sinon.stub();
    mockLlamaClient.healthCheck = sinon.stub();
  });

  describe("LlamaClient Integration", () => {
    it("should be able to create a mock LlamaClient", () => {
      expect(mockLlamaClient).to.be.instanceOf(LlamaClient);
    });

    it("should handle complete calls", async () => {
      (mockLlamaClient.complete as sinon.SinonStub).resolves("Mock response");

      const result = await mockLlamaClient.complete({ prompt: "test message" });

      expect(result).to.equal("Mock response");
      expect((mockLlamaClient.complete as sinon.SinonStub).calledOnce).to.be
        .true;
      expect(
        (mockLlamaClient.complete as sinon.SinonStub).calledWith({
          prompt: "test message",
        })
      ).to.be.true;
    });

    it("should handle healthCheck calls", async () => {
      (mockLlamaClient.healthCheck as sinon.SinonStub).resolves(true);

      const result = await mockLlamaClient.healthCheck();

      expect(result).to.be.true;
      expect((mockLlamaClient.healthCheck as sinon.SinonStub).calledOnce).to.be
        .true;
    });

    it("should handle health check failures", async () => {
      (mockLlamaClient.healthCheck as sinon.SinonStub).resolves(false);

      const result = await mockLlamaClient.healthCheck();

      expect(result).to.be.false;
      expect((mockLlamaClient.healthCheck as sinon.SinonStub).calledOnce).to.be
        .true;
    });

    it("should handle complete errors", async () => {
      const error = new Error("Connection failed");
      (mockLlamaClient.complete as sinon.SinonStub).rejects(error);

      try {
        await mockLlamaClient.complete({ prompt: "test message" });
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect(err).to.equal(error);
      }

      expect((mockLlamaClient.complete as sinon.SinonStub).calledOnce).to.be
        .true;
    });
  });
});
