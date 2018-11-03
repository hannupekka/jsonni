import CodeMirror from "codemirror";
import "../node_modules/codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import stringify from "stringify-object";
import convertToObject from "convert-to-object";
import safeEval from "safe-eval";
import "./stylesheets/main.less";
import "./helpers/context_menu";
import "./helpers/external_links";

// const hasClass = (elem, className) =>
//   new RegExp(" " + className + " ").test(" " + elem.className + " ");

// CodeMirror base options.
const MIRROR_OPTIONS = {
  mode: { name: "javascript", json: true },
  lineNumbers: true,
  matchBrackets: true,
  autoCloseBrackets: true,
  tabSize: 2
};

// CodeMirror for input.
const inputMirror = CodeMirror.fromTextArea(
  document.querySelector(".textarea--input"),
  MIRROR_OPTIONS
);

// CodeMirror for output.
const outputMirror = CodeMirror.fromTextArea(
  document.querySelector(".textarea--output"),
  {
    ...MIRROR_OPTIONS,
    readOnly: true
  }
);

// CodeMirror for query.
const queryMirror = CodeMirror.fromTextArea(
  document.querySelector(".textarea--query"),
  {
    ...MIRROR_OPTIONS,
    mode: "javascript",
    lineNumbers: false
  }
);

/**
 * Checks if given string is JSON.
 * @param {string} input Input to check.
 */
const isJSON = input => {
  try {
    JSON.parse(input);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Evaluates query.
 * @param {string} input Input
 * @param {string} query Query
 */
const evaluateQuery = (input, query) => {
  try {
    const evalQuery = safeEval(query);
    const isInputJSON = isJSON(input);
    const outputMirrorValue = isInputJSON
      ? JSON.stringify(evalQuery, null, 2)
      : stringify(evalQuery, { singleQuotes: false });
    outputMirror.setValue(outputMirrorValue);
  } catch (e) {
    // Do nothing.
  }
};

/**
 * Parses input and returns it as string.
 * @param {string} input Input
 */
const parseInput = input => {
  const text = input.join();
  const isInputJSON = isJSON(text);

  return isInputJSON
    ? JSON.stringify(JSON.parse(text), null, 2)
    : stringify(convertToObject(text), { singleQuotes: false });
};

/**
 * Get input value.
 */
const getInputValue = () => inputMirror.getValue();

/**
 * Get query value.
 */
const getQueryValue = () =>
  queryMirror.getValue().replace("input.", `${getInputValue()}.`);

/**
 * Add event listener to input.
 */
inputMirror.on("change", (instance, change) => {
  const { origin, text } = change;

  // Format pasted input.
  if (origin === "paste" && text.length > 0) {
    const inputMirrorValue = parseInput(text);
    inputMirror.setValue(inputMirrorValue);
  }

  evaluateQuery(getInputValue(), getQueryValue());
});

/**
 * Add event listener to query.
 */
queryMirror.on("change", () => {
  evaluateQuery(getInputValue(), getQueryValue());
});
