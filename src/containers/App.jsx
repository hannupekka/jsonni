import React, { Component } from "react";
import CodeMirror from "codemirror";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/display/placeholder";
import "codemirror/addon/lint/lint";
import "codemirror/addon/lint/javascript-lint";
import "codemirror/addon/lint/json-lint";
import stringify from "stringify-object";
import convertToObject from "convert-to-object";
import prettify from "insomnia-prettify";
import safeEval from "safe-eval";
import * as _ from "lodash";
import { from } from "fromfrom";
import classNames from "classnames";
import { JSHINT } from "jshint";
import jsonlint from "jsonlint";

window.JSHINT = JSHINT;
window.jsonlint = jsonlint;

// CodeMirror base options.
const MIRROR_OPTIONS = {
  mode: { name: "javascript", json: true },
  lineNumbers: true,
  matchBrackets: true,
  autoCloseBrackets: true,
  tabSize: 2,
  theme: "ttcn"
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showHelp: false,
      inputError: false,
      queryError: false,
      errorMessage: null
    };

    // Textarea refs.
    this.inputMirrorRef = React.createRef();
    this.outputMirrorRef = React.createRef();
    this.queryMirrorRef = React.createRef();

    // CodeMirrors.
    this.inputMirror = null;
    this.outputMirror = null;
    this.queryMirror = null;
  }

  componentDidMount() {
    // Create CodeMirrors.
    this.inputMirror = CodeMirror.fromTextArea(this.inputMirrorRef.current, {
      ...MIRROR_OPTIONS,
      mode: "application/json",
      placeholder: "Enter your input data",
      lint: true
    });

    this.outputMirror = CodeMirror.fromTextArea(this.outputMirrorRef.current, {
      ...MIRROR_OPTIONS,
      readOnly: true,
      cursorBlinkRate: -1
    });

    this.queryMirror = CodeMirror.fromTextArea(this.queryMirrorRef.current, {
      ...MIRROR_OPTIONS,
      mode: "javascript",
      lint: {
        esversion: 6
        // globals: ["$input"]
      },
      lineNumbers: false,
      placeholder: "Enter your query, eg. $input.map(i => i)"
    });

    // Attach event listeners to mirrors.
    this.inputMirror.on("change", _.debounce(this.onInputChange, 500));
    this.queryMirror.on("change", _.debounce(this.onQueryChange, 500));
  }

  /**
   * Checks if given string is JSON.
   * @param {string} input Input to check.
   */
  isJSON = input => {
    try {
      JSON.parse(input);
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * Parses input and returns it as string.
   * @param {string} input Input
   */
  parseInput = input => {
    const isInputJSON = this.isJSON(input);

    const tabSize = new Array(MIRROR_OPTIONS.tabSize + 1).join(" ");
    return isInputJSON
      ? prettify.json(JSON.stringify(JSON.parse(input)), tabSize, true)
      : stringify(convertToObject(input), { singleQuotes: false });
  };

  /**
   * Validates input value.
   * @param {String} value Input.
   */
  validateInput = value => {
    if (value.length === 0) {
      return this.setState({ inputError: false });
    }

    const isInputJSON = this.isJSON(value);

    try {
      const result = isInputJSON
        ? JSON.stringify(JSON.parse(value), null, 2)
        : safeEval(value);
      this.setState({ inputError: false });
      return !!result;
    } catch (e) {
      this.setState({ inputError: true });
      return false;
    }
  };

  /**
   * Get query value and context
   * @param {String} value Query value
   */
  parseQueryValueAndContext = value => {
    const inputValue = this.inputMirror.getValue();
    const queryValue = _.trimEnd(value, ";");

    // ES6
    if (queryValue.startsWith("$input.")) {
      return {
        queryValue: queryValue.replace("$input.", `${inputValue}.`),
        context: null
      };
    }

    // Lodash
    if (queryValue.startsWith("_.")) {
      const isChained = queryValue.startsWith("_.chain(");
      const queryValueSuffix = isChained ? ".value()" : "";
      return {
        queryValue:
          queryValue.replace("$input", `${inputValue}`) + queryValueSuffix,
        context: _
      };
    }

    // fromfrom
    if (queryValue.startsWith("from")) {
      return {
        queryValue: queryValue.replace("$input", inputValue),
        context: { from }
      };
    }

    return null;
  };

  /**
   * Evaluates query.
   * @param {string} input Input
   * @param {string} query Query
   */
  evaluateQuery = (input, query) => {
    if (input.length === 0 || query === null) {
      this.setState({ queryError: false });
      return;
    }

    const { queryValue, context } = query;

    try {
      const evalQuery = safeEval(queryValue, context);
      const isInputJSON = this.isJSON(input);
      const outputMirrorValue = isInputJSON
        ? JSON.stringify(evalQuery, null, 2)
        : stringify(evalQuery, { singleQuotes: false });
      this.setState({ queryError: false, errorMessage: null });
      this.outputMirror.setValue(outputMirrorValue);
    } catch (e) {
      this.setState({ queryError: true, errorMessage: e.toString() });
    }
  };

  /**
   * Handles changes in input mirror.
   * @param {object} editor Code mirror editor
   * @param {object} data Change data
   */
  onInputChange = () => {
    const inputValue = this.inputMirror.getValue();

    if (!this.validateInput(inputValue)) {
      return false;
    }

    const queryValue = this.parseQueryValueAndContext(
      this.queryMirror.getValue()
    );

    return this.evaluateQuery(inputValue, queryValue);
  };

  /**
   * Handles changes in query mirror.
   * @param {object} editor Code mirror editor
   * @param {object} data Change data
   */
  onQueryChange = () => {
    const inputValue = this.inputMirror.getValue();
    const queryValue = this.parseQueryValueAndContext(
      this.queryMirror.getValue()
    );

    this.evaluateQuery(inputValue, queryValue);
  };

  onBeautify = () => {
    const { inputError } = this.state;
    if (inputError) {
      return false;
    }

    const formatted = this.parseInput(this.inputMirror.getValue());
    return this.inputMirror.setValue(formatted);
  };

  onClear = () => this.outputMirror.setValue("");

  toggleHelp = () => {
    const { showHelp } = this.state;
    this.setState({ showHelp: !showHelp });
  };

  render() {
    const { showHelp, inputError, queryError, errorMessage } = this.state;

    return (
      <div className="container">
        <div className="container--top">
          <div className="container--input">
            <div className="title">
              <span className="title--content">Input</span>
              <span
                id="beautify"
                className="button"
                role="button"
                onClick={this.onBeautify}
              >
                Beautify
              </span>
            </div>
            <textarea
              id="input"
              className={classNames("textarea--input", { error: inputError })}
              ref={this.inputMirrorRef}
            />
          </div>
          <div className="container--output">
            <div className="title">
              <span className="title--content">Output</span>
              <span
                id="clear"
                className="button"
                role="button"
                onClick={this.onClear}
              >
                Clear
              </span>
            </div>
            <textarea
              id="output"
              className="textarea--output"
              ref={this.outputMirrorRef}
            />
          </div>
        </div>
        <div className="container--bottom">
          <div className="title">
            <span className="title--content">Query</span>
            {queryError && <span className="error">{errorMessage}</span>}
            <span
              id="help"
              className="button"
              role="button"
              onClick={this.toggleHelp}
            >
              Help
            </span>
          </div>
          <textarea
            id="query"
            className={classNames("textarea--query", { error: queryError })}
            ref={this.queryMirrorRef}
          />
        </div>
        <div className={classNames("overlay", { hidden: !showHelp })}>
          <div className="overlay--backdrop" />
          <div className="overlay--content">
            <div className="overlay--content-title">
              <button
                id="close"
                className="button icon big"
                role="button"
                onClick={this.toggleHelp}
              >
                <svg className="fa fa-close">
                  <use xlinkHref="#fa-close" />
                </svg>
              </button>
            </div>
            <div className="overlay--content-body">
              Content of <i>Input</i>-field is available in <i>Query</i>-field
              as <code>$input</code>
              <p>
                You can use one of the following syntaxes to work with input
                data.
              </p>
              <br />
              <p>ES6</p>
              <p>
                <code>$input.map(i => i)</code>
              </p>
              <br />
              <p>Lodash 4</p>
              <p>
                <code>_.map($input, i => i)</code>
              </p>
              <p>
                <code>_.chain($input).map(i => i)</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
