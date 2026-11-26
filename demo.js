(() => {
  // Lightbox para tarjetas de gráficos duales (.chart-frame img)
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbCap = document.getElementById("lbCap");
  document.querySelectorAll(".chart-frame img").forEach((img) => {
    img.addEventListener("click", () => {
      if (!lb || !lbImg) return;
      lbImg.src = img.src;
      if (lbCap) lbCap.textContent = img.alt || "";
      lb.classList.add("open");
    });
  });

  const apiBaseInput = document.getElementById("demoApiBase");
  if (!apiBaseInput) return;

  const btnEnvLocal = document.getElementById("btnEnvLocal");
  const btnEnvRender = document.getElementById("btnEnvRender");
  const demoStatus = document.getElementById("demoStatus");

  const dCiudad = document.getElementById("dCiudad");
  const dPm25 = document.getElementById("dPm25");
  const dPm10 = document.getElementById("dPm10");
  const dTemp = document.getElementById("dTemp");
  const dHum = document.getElementById("dHum");
  const dWind = document.getElementById("dWind");
  const dPress = document.getElementById("dPress");
  const dHora = document.getElementById("dHora");

  const btnRunPredict = document.getElementById("btnRunPredict");
  const btnPresetCrit = document.getElementById("btnPresetCrit");
  const btnPresetSafe = document.getElementById("btnPresetSafe");

  const resBadge = document.getElementById("resBadge");
  const resMeta = document.getElementById("resMeta");
  const resProb = document.getElementById("resProb");
  const resSub = document.getElementById("resSub");
  const resBar = document.getElementById("resBar");
  const resFactors = document.getElementById("resFactors");
  const resRec = document.getElementById("resRec");

  // Contexto completo del último snapshot en vivo (lags y gases) para que
  // GET /live-monitor/{ciudad} y POST /predict coincidan al 100 %
  let liveContext = null;

  function setEnv(mode) {
    btnEnvLocal.classList.toggle("is-active", mode === "local");
    btnEnvRender.classList.toggle("is-active", mode === "render");
    apiBaseInput.value =
      mode === "local" ? "http://127.0.0.1:8000" : "https://aeroguard-peru.onrender.com";
  }

  btnEnvLocal?.addEventListener("click", () => setEnv("local"));
  btnEnvRender?.addEventListener("click", () => setEnv("render"));

  function renderPrediction(data, sourceText) {
    const pct = (Number(data.probabilidad_riesgo_6h) * 100).toFixed(1);
    const nivel = data.nivel_riesgo || "Moderado";
    let tone = "tone-warn";
    if (nivel === "Bajo") tone = "tone-ok";
    if (nivel === "Crítico" || nivel === "Alto") tone = "tone-bad";

    resBadge.textContent = `Riesgo ${nivel}`;
    resBadge.className = `res-badge ${tone}`;
    resMeta.textContent = `${data.ciudad} · ${sourceText}`;
    resProb.textContent = `${pct} %`;
    resSub.textContent = `${data.etiqueta} (predicción = ${data.prediccion})`;
    resBar.style.width = `${pct}%`;

    resFactors.innerHTML = "";
    (data.factores_clave || []).slice(0, 3).forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      resFactors.appendChild(li);
    });
    resRec.textContent = data.recomendacion || "";
  }

  function renderError422(detailList) {
    resBadge.textContent = "HTTP 422 · Pydantic";
    resBadge.className = "res-badge tone-warn";
    resMeta.textContent = "Validación rechazada";
    resProb.textContent = "422";
    resSub.textContent = "Datos fuera de rango permitido por el contrato";
    resBar.style.width = "0%";
    resFactors.innerHTML = "";
    detailList.slice(0, 3).forEach((msg) => {
      const li = document.createElement("li");
      li.textContent = msg;
      resFactors.appendChild(li);
    });
    resRec.textContent =
      "Corrige el valor fuera de rango (ej. Temperatura -20..50 °C, Humedad 0..100 %, PM2.5 0..500).";
  }

  // Si el usuario cambia ciudad manualmente o usa presets, limpia el contexto previo
  dCiudad?.addEventListener("change", () => {
    liveContext = null;
  });

  // Botones rápidos por ciudad: consulta GET /live-monitor/{ciudad}
  document.querySelectorAll(".city-mini-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".city-mini-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const city = btn.dataset.city;
      const base = apiBaseInput.value.replace(/\/+$/, "");
      demoStatus.textContent = `Consultando Open-Meteo en vivo para ${city}...`;

      try {
        const resp = await fetch(`${base}/live-monitor/${encodeURIComponent(city)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const cur = data.datos_actuales || {};

        liveContext = { ...cur, ciudad: data.ciudad };
        dCiudad.value = data.ciudad;
        if (cur.pm2_5 !== undefined) dPm25.value = cur.pm2_5;
        if (cur.pm10 !== undefined) dPm10.value = cur.pm10;
        if (cur.temperature_2m !== undefined) dTemp.value = cur.temperature_2m;
        if (cur.relative_humidity_2m !== undefined) dHum.value = cur.relative_humidity_2m;
        if (cur.wind_speed_10m !== undefined) dWind.value = cur.wind_speed_10m;
        if (cur.surface_pressure !== undefined) dPress.value = cur.surface_pressure;
        if (cur.hora !== undefined) dHora.value = cur.hora;

        renderPrediction(data, `${data.origen_datos} (${data.tiempo_inferencia_ms} ms)`);
        demoStatus.textContent = `Datos reales cargados (${cur.hora_lima || "ahora"}). Si pulsas Predecir obtendrás exactamente el mismo resultado.`;
      } catch (err) {
        demoStatus.textContent = `No se pudo conectar a ${base}. Inicia ABRIR_SISTEMA.bat o verifica la URL.`;
      }
    });
  });

  // Presets manuales
  btnPresetCrit?.addEventListener("click", () => {
    liveContext = null;
    dCiudad.value = "Arequipa";
    dPm25.value = 21.4;
    dPm10.value = 38.5;
    dTemp.value = 15.2;
    dHum.value = 58;
    dWind.value = 3.4;
    dPress.value = 772;
    dHora.value = 20;
    demoStatus.textContent = "Preset de alto riesgo cargado (Arequipa noche, viento débil).";
  });

  btnPresetSafe?.addEventListener("click", () => {
    liveContext = null;
    dCiudad.value = "Piura";
    dPm25.value = 6.2;
    dPm10.value = 12.0;
    dTemp.value = 26.5;
    dHum.value = 65;
    dWind.value = 14.0;
    dPress.value = 1010;
    dHora.value = 14;
    demoStatus.textContent = "Preset normal cargado (Piura tarde, buena ventilación).";
  });

  // Consultar POST /predict
  btnRunPredict?.addEventListener("click", async () => {
    const base = apiBaseInput.value.replace(/\/+$/, "");
    const useLiveCtx = liveContext && liveContext.ciudad === dCiudad.value;

    const payload = {
      ciudad: dCiudad.value,
      temperature_2m: Number(dTemp.value),
      relative_humidity_2m: Number(dHum.value),
      precipitation: useLiveCtx && liveContext.precipitation !== undefined ? liveContext.precipitation : 0.0,
      surface_pressure: Number(dPress.value),
      wind_speed_10m: Number(dWind.value),
      wind_direction_10m: useLiveCtx && liveContext.wind_direction_10m !== undefined ? liveContext.wind_direction_10m : 200.0,
      shortwave_radiation:
        useLiveCtx && liveContext.shortwave_radiation !== undefined
          ? liveContext.shortwave_radiation
          : Number(dHora.value) >= 7 && Number(dHora.value) <= 17
          ? 450.0
          : 0.0,
      cloud_cover: useLiveCtx && liveContext.cloud_cover !== undefined ? liveContext.cloud_cover : 25.0,
      pm10: Number(dPm10.value),
      pm2_5: Number(dPm25.value),
      carbon_monoxide: useLiveCtx && liveContext.carbon_monoxide !== undefined ? liveContext.carbon_monoxide : 320.0,
      nitrogen_dioxide:
        useLiveCtx && liveContext.nitrogen_dioxide !== undefined
          ? liveContext.nitrogen_dioxide
          : Number(dPm25.value) >= 15
          ? 24.0
          : 10.0,
      ozone: useLiveCtx && liveContext.ozone !== undefined ? liveContext.ozone : 35.0,
      pm25_lag3: useLiveCtx && liveContext.pm25_lag3 !== undefined ? liveContext.pm25_lag3 : null,
      pm25_lag6: useLiveCtx && liveContext.pm25_lag6 !== undefined ? liveContext.pm25_lag6 : null,
      pm10_lag3: useLiveCtx && liveContext.pm10_lag3 !== undefined ? liveContext.pm10_lag3 : null,
      temp_delta3: useLiveCtx && liveContext.temp_delta3 !== undefined ? liveContext.temp_delta3 : 0.0,
      hum_delta3: useLiveCtx && liveContext.hum_delta3 !== undefined ? liveContext.hum_delta3 : 0.0,
      wind_delta3: useLiveCtx && liveContext.wind_delta3 !== undefined ? liveContext.wind_delta3 : 0.0,
      hora: Number(dHora.value),
      mes: useLiveCtx && liveContext.mes !== undefined ? liveContext.mes : 11
    };

    demoStatus.textContent = `Enviando POST ${base}/predict...`;
    btnRunPredict.disabled = true;

    try {
      const resp = await fetch(`${base}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (resp.status === 422) {
        const errData = await resp.json();
        const msgs = (errData.detail || []).map((d) => {
          const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "campo";
          return `${field}: ${d.msg}`;
        });
        renderError422(msgs.length ? msgs : ["Error de validación Pydantic (422)"]);
        demoStatus.textContent = "Validación Pydantic v2: datos rechazados con HTTP 422.";
        return;
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      renderPrediction(data, `POST /predict (${data.tiempo_inferencia_ms} ms)`);
      demoStatus.textContent = `Predicción recibida correctamente desde ${base}/predict.`;
    } catch (err) {
      demoStatus.textContent = `Sin conexión con ${base}. Enciende ABRIR_SISTEMA.bat si estás en local.`;
    } finally {
      btnRunPredict.disabled = false;
    }
  });
})();
