import CodeMirror from "codemirror";
import "../node_modules/codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/display/placeholder";
import stringify from "stringify-object";
import convertToObject from "convert-to-object";
import safeEval from "safe-eval";
import "./stylesheets/main.less";
import "./helpers/context_menu";
import "./helpers/external_links";
import _ from "lodash";

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
  { ...MIRROR_OPTIONS, placeholder: "Enter your input data" }
);

// CodeMirror for output.
const outputMirror = CodeMirror.fromTextArea(
  document.querySelector(".textarea--output"),
  {
    ...MIRROR_OPTIONS,
    readOnly: true,
    cursorBlinkRate: -1
  }
);

// CodeMirror for query.
const queryMirror = CodeMirror.fromTextArea(
  document.querySelector(".textarea--query"),
  {
    ...MIRROR_OPTIONS,
    mode: "javascript",
    lineNumbers: false,
    placeholder: "Enter your query, eg. $input.map(i => i)"
  }
);
const queryEl = queryMirror.getWrapperElement();

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
  if (query === null) {
    return;
  }

  const { queryValue, context } = query;

  try {
    const evalQuery = safeEval(queryValue, context);
    const isInputJSON = isJSON(input);
    const outputMirrorValue = isInputJSON
      ? JSON.stringify(evalQuery, null, 2)
      : stringify(evalQuery, { singleQuotes: false });
    outputMirror.setValue(outputMirrorValue);
    queryEl.classList.remove("error");
  } catch (e) {
    queryEl.classList.add("error");
  }
};

const evaluateQueryDebounced = _.debounce(evaluateQuery, 500);

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
 * Get query value and context
 */
const parseQueryValueAndContext = value => {
  const queryValue = _.trimEnd(value, ";");

  // ES6
  if (queryValue.startsWith("$input.")) {
    return {
      queryValue: queryValue.replace("$input.", `${getInputValue()}.`),
      context: null
    };
  }

  // Lodash
  if (queryValue.startsWith("_.")) {
    const isChained = queryValue.startsWith("_.chain(");
    const queryValueSuffix = isChained ? ".value()" : "";
    return {
      queryValue:
        queryValue.replace("$input", `${getInputValue()}`) + queryValueSuffix,
      context: _
    };
  }

  return null;
};

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

  const inputValue = inputMirror.getValue();
  const queryValue = parseQueryValueAndContext(queryMirror.getValue());
  evaluateQueryDebounced(inputValue, queryValue);
});

/**
 * Add event listener to query.
 */
queryMirror.on("change", () => {
  const inputValue = inputMirror.getValue();
  const queryValue = parseQueryValueAndContext(queryMirror.getValue());

  if (queryValue === null) {
    queryEl.classList.remove("error");
    return;
  }

  evaluateQueryDebounced(inputValue, queryValue);
});

/**
 * Add event listener to help button.
 */
document.querySelector("#help").addEventListener("click", () => {
  document.querySelector(".overlay").classList.remove("hidden");
});

/**
 * Add event listener to close help button.
 */
document.querySelector("#close").addEventListener("click", () => {
  document.querySelector(".overlay").classList.add("hidden");
});
