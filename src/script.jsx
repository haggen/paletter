import { createRoot } from "react-dom/client";
import { StrictMode, useEffect, useMemo, useState } from "react";
import Color from "colorjs.io";

// ---
// ---
// ---

const initialColors = [
  "lch(50 92 52)",
  "lch(50 91 95)",
  "lch(50 110 130)",
  "lch(50 50 270)",
  "lch(50 0 0)",
];

const initialShades = [5, 25, 50, 75, 95];

const availableFormats = ["hex", "rgb", "hsl", "lch"];

function getShadedColor(color, s) {
  return new Color(color).to("lch").set({
    l: (l) => s * (0.5 + l / 100),
    c: (c) => c * (1 - Math.abs(s - 50) / 50),
  });
}

function copyToClipboard(value) {
  navigator.clipboard.writeText(value);
}

function getFormattedColor(color, format) {
  switch (format) {
    case "hex":
      return color.to("srgb").toString({ format: "hex" });
    case "rgb":
      return color.to("srgb").toString({ format: "rgb", precision: 2 });
    case "hsl":
      return color.to("hsl").toString({ format: "hsl", precision: 2 });
    case "lch":
      return color.to("lch").toString({ precision: 2 });
    default:
      throw new Error(`Unknown color format: ${format}`);
  }
}

function getCSS(colorTable, backgroundColor, format) {
  const src = colorTable.map((colors, colorId) => {
    return colors
      .map((color, shadeId) => {
        return `--color-${colorId + 1}-${shadeId + 1}: ${getFormattedColor(
          color,
          format
        )};`;
      })
      .join("\n");
  });

  src.unshift(`--background: ${getFormattedColor(backgroundColor, format)};`);

  return src.join("\n");
}

// ---
// ---
// ---

function useValueRotation(values, initialIndex = 0) {
  const [index, setIndex] = useState(initialIndex);

  function rotate() {
    setIndex((index) => (index + 1) % values.length);
  }

  return [values[index], rotate];
}

function useList(initialList) {
  const [list, setList] = useState(initialList);

  function push(value) {
    setList((list) => [...list, value]);
  }

  function update(target, value) {
    setList((list) => list.map((item, id) => (id === target ? value : item)));
  }

  function remove(target) {
    setList((list) => list.filter((_, id) => id !== target));
  }

  return { list, push, update, remove };
}

function useLocalStore(key) {
  const storedValue = localStorage.getItem(key);

  function store(value) {
    useEffect(() => {
      localStorage.setItem(key, JSON.stringify(value));
    }, [value]);
  }

  return [storedValue ? JSON.parse(storedValue) : undefined, store];
}

function useContrastingColor(backgroundColor) {
  return new Color(backgroundColor).contrast("black", "WCAG21") > 4.5
    ? "black"
    : "white";
}

// ---
// ---
// ---

function NumberInput({ ...props }) {
  const initialStep = props.step ?? 1;
  const [step, setStep] = useState(initialStep);

  function onKeyDown(e) {
    if (e.key === "Shift") {
      setStep(initialStep * 10);
    }
  }

  function onKeyUp(e) {
    if (e.key === "Shift") {
      setStep(initialStep);
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  props.step = step;

  return <input type="number" className="number-input" {...props} />;
}

function ColorInput(props) {
  const color = new Color(props.color).to("lch");

  function onChange(e) {
    props.onChange(
      new Color(color)
        .set({ [e.target.name]: e.target.valueAsNumber })
        .toString()
    );
  }

  return (
    <div onChange={onChange} className="color-input">
      <NumberInput
        name="l"
        defaultValue={Math.round(color.lch.l)}
        step="1"
        min="0"
        max="100"
        title="Lightness of LCH"
      />
      <NumberInput
        name="c"
        defaultValue={Math.round(color.lch.c)}
        step="1"
        min="0"
        max="131"
        title="Chroma of LCH"
      />
      <NumberInput
        name="h"
        defaultValue={Math.round(color.lch.h || 0)}
        step="1"
        min="0"
        max="359"
        title="Hue of LCH"
      />
    </div>
  );
}

function ColorCell({ color, backgroundColor, format, swapColors }) {
  const label = getFormattedColor(color, format);
  const textColor = useContrastingColor(color);

  return (
    <div
      className="color-table-cell"
      style={
        swapColors
          ? {
              color: color.to("srgb").toString(),
              backgroundColor: "transparent",
            }
          : {
              color: textColor,
              backgroundColor: color.to("srgb").toString(),
            }
      }
    >
      <button title="Copy to clipboard" onClick={() => copyToClipboard(label)}>
        {label}
      </button>

      <span title="Contrast against background WCAG 2.1">
        {color.contrast(backgroundColor, "WCAG21").toFixed(2)}
      </span>
    </div>
  );
}

function App() {
  const [storedColors, setStoredColors] = useLocalStore("colors");
  const colors = useList(storedColors ?? initialColors);
  setStoredColors(colors.list);

  const [storedShades, setStoredShades] = useLocalStore("shades");
  const shades = useList(storedShades ?? initialShades);
  setStoredShades(shades.list);

  const [storedBackgroundColor, setStoredBackgroundColor] =
    useLocalStore("backgroundColor");
  const [backgroundColor, setBackgroundColor] = useState(
    storedBackgroundColor ?? "white"
  );
  setStoredBackgroundColor(backgroundColor);

  const [storedFormat, setStoredFormat] = useLocalStore("format");
  const [format, rotateFormat] = useValueRotation(
    availableFormats,
    storedFormat ? availableFormats.indexOf(storedFormat) : 0
  );
  setStoredFormat(format);

  const [storedSwapColors, setStoredSwapColors] = useLocalStore("swap-colors");
  const [swapColors, setSwapColors] = useState(storedSwapColors ?? false);
  setStoredSwapColors(swapColors);

  const colorTable = useMemo(
    () =>
      colors.list.map((color) =>
        shades.list.map((shade) => getShadedColor(color, shade))
      ),
    [colors.list, shades.list]
  );

  useEffect(() => {
    document.body.style.backgroundColor = backgroundColor;
  }, [backgroundColor]);

  const textColor = useContrastingColor(backgroundColor);

  return (
    <main style={{ color: textColor }}>
      <div className="menu">
        Background:
        <ColorInput
          color={backgroundColor}
          onChange={(color) => setBackgroundColor(color.toString())}
        />
        <button onClick={() => shades.push(100)}>Add shade</button>
        <button onClick={() => colors.push("red")}>Add color</button>
        <button onClick={() => rotateFormat()}>Format: {format}</button>
        <label className="check-box">
          <input
            type="checkbox"
            checked={swapColors}
            onChange={() => setSwapColors(!swapColors)}
          />{" "}
          Swap colors
        </label>
        <button
          onClick={() =>
            copyToClipboard(getCSS(colorTable, backgroundColor, format))
          }
        >
          Copy CSS
        </button>
        <a href="https://github.com/haggen/paletter">GitHub</a>
      </div>

      <div className="color-table">
        <div className="color-table-column">
          <div className="color-table-cell">&nbsp;</div>

          {shades.list.map((shade, shadeId) => (
            <div key={shadeId} className="color-table-cell">
              <NumberInput
                step={0.1}
                min="0"
                max="100"
                value={shade}
                onChange={(e) => shades.update(shadeId, e.target.valueAsNumber)}
              />
              <button className="button" onClick={() => shades.remove(shadeId)}>
                ×
              </button>
            </div>
          ))}
        </div>

        {colorTable.map((row, colorId) => (
          <div key={colorId} className="color-table-column">
            <div className="color-table-cell">
              <ColorInput
                color={colors.list[colorId]}
                onChange={(color) => colors.update(colorId, color.toString())}
              />
              <button className="button" onClick={() => colors.remove(colorId)}>
                ×
              </button>
            </div>

            {row.map((color, shadeId) => (
              <ColorCell
                key={shadeId}
                color={color}
                backgroundColor={backgroundColor}
                format={format}
                swapColors={swapColors}
              />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

createRoot(window.root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
