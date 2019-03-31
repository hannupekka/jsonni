import { expect } from "chai";
import testUtils from "./utils";

describe("application launch", () => {
  beforeEach(testUtils.beforeEach);
  afterEach(testUtils.afterEach);

  it("shows codemirror for input", function() {
    return this.app.client.element("#input").then(element => {
      expect(element.status).to.equal(0);
    });
  });

  it("shows codemirror for output", function() {
    return this.app.client.element("#output").then(element => {
      expect(element.status).to.equal(0);
    });
  });

  it("shows codemirror for query", function() {
    return this.app.client.element("#query").then(element => {
      expect(element.status).to.equal(0);
    });
  });
});
