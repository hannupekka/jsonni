import "./stylesheets/main.less";
import "./helpers/context_menu.js";
import "./helpers/external_links.js";

const hasClass = (elem, className) =>
  new RegExp(" " + className + " ").test(" " + elem.className + " ");

const input = document.querySelector(".textarea--input");
const output = document.querySelector(".textarea--output");

input.addEventListener("input", e => {
  const inputValue = e.target.value;

  output.innerHTML = inputValue;
});
