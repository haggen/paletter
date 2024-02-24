import { createRoot } from "react-dom/client";
import { StrictMode, useEffect, useMemo, useReducer, useState } from "react";
import Color from "colorjs.io";

function copyToClipboard(value) {
  navigator.clipboard.writeText(value);
}

function NumberInput(props) {
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

  return <input type="number" {...props} step={step} />;
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

function useLocalStored(key) {
  const storedValue = localStorage.getItem(key);

  function store(value) {
    useEffect(() => {
      localStorage.setItem(key, JSON.stringify(value));
    }, [value]);
  }

  return [storedValue ? JSON.parse(storedValue) : undefined, store];
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
      <NumberInput name="l" defaultValue={color.lch.l} min="0" max="100" />
      <NumberInput name="c" defaultValue={color.lch.c} min="0" max="131" />
      <NumberInput name="h" defaultValue={color.lch.h || 0} min="0" max="359" />
    </div>
  );
}

const initialColors = ["#ff5500", "#aaff00", "#5500ff", "#000000"];

const initialShades = [0, 25, 50, 75, 100];

function getShadedColor(color, shade) {
  return new Color(color).to("lch").set({
    l: (l) => l * (shade / 100),
    c: (c) => c - Math.abs(shade - 50),
  });
}

function App() {
  const [storedColors, setStoredColors] = useLocalStored("colors");
  const colors = useList(storedColors ?? initialColors);
  setStoredColors(colors.list);

  const [storedShades, setStoredShades] = useLocalStored("shades");
  const shades = useList(storedShades ?? initialShades);
  setStoredShades(shades.list);

  const [storedBackgroundColor, setStoredBackgroundColor] =
    useLocalStored("backgroundColor");
  const [backgroundColor, setBackgroundColor] = useState(
    storedBackgroundColor ?? "white"
  );

  setStoredBackgroundColor(backgroundColor);

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

  return (
    <>
      <div>
        <ColorInput
          color={backgroundColor}
          onChange={(color) => setBackgroundColor(color.toString())}
        />
        <button onClick={() => shades.push(100)}>Add shade</button>
        <button onClick={() => colors.push("red")}>Add color</button>
      </div>

      <div className="color-table">
        <div className="color-table-column">
          <div className="color-table-cell">-</div>

          {shades.list.map((shade, shadeId) => (
            <div key={shadeId} className="color-table-cell">
              <NumberInput
                step={0.1}
                min="0"
                max="100"
                value={shade}
                onChange={(e) => shades.update(shadeId, e.target.valueAsNumber)}
              />
              <button onClick={() => shades.remove(shadeId)}>×</button>
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
              <button onClick={() => colors.remove(colorId)}>×</button>
            </div>

            {row.map((color, shadeId) => (
              <div
                key={shadeId}
                className="color-table-cell"
                style={{
                  "--color": color.toString(),
                }}
                onClick={() =>
                  copyToClipboard(color.to("srgb").toString({ format: "hex" }))
                }
              >
                <span>{color.to("srgb").toString({ format: "hex" })}</span>
                <span>
                  {color
                    .to("srgb")
                    .contrast(backgroundColor, "WCAG21")
                    .toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

createRoot(window.root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
