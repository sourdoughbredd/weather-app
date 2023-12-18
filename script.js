const API_KEY = "63ed6dc9eafb4c5786e153351231112";

const apiRequest = async function (url) {
  try {
    const response = await fetch(url);
    // Check for HTTP error and build error object
    if (!response.ok) {
      const error = new Error("HTTP error");
      error.status = response.status;
      error.response = await response.json();
      throw error;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
};

const fetchCurrentWeather = async function (searchStr) {
  const url = `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${searchStr}`;
  const data = await apiRequest(url);
  return { location: data.location, current: data.current };
};

const fetchForecastWeather = async function (searchStr) {
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${searchStr}&days=3`;
  const data = await apiRequest(url);
  return { location: data.location, forecast: data.forecast };
};

function handleApiError(error) {
  const code = error.response.error.code;
  if (code == 1006) {
    alert("No matching location found. Please try again.");
  }
}

const getWeather = async function (searchStr) {
  const currentResp = await fetchCurrentWeather(searchStr);
  const forecastResp = await fetchForecastWeather(searchStr);

  if (!currentResp || !forecastResp) {
    return null;
  }

  // Extract location
  const location = {
    name: currentResp.location.name,
    region: currentResp.location.region,
    country: currentResp.location.country,
    local_time: currentResp.location.localtime,
  };
  // Extract current weather
  const current = {
    last_updated: currentResp.current.last_updated,
    condition: currentResp.current.condition,
    temp_f: currentResp.current.temp_f,
  };
  // Extract forecast (array of days)
  let forecastArrRaw = forecastResp.forecast.forecastday;
  let forecast = [];
  forecastArrRaw.forEach((day) => {
    // Add data for whole day
    const dayData = {
      date: day.date,
      condition: day.day.condition,
      mintemp_f: day.day.mintemp_f,
      maxtemp_f: day.day.maxtemp_f,
    };
    // Add the hourly data (array of hours)
    const hourArrRaw = day.hour;
    let hourArr = [];
    hourArrRaw.forEach((hour) => {
      const hourData = {
        time: hour.time,
        condition: hour.condition,
        temp_f: hour.temp_f,
      };
      hourArr.push(hourData);
    });
    dayData.hour = hourArr;
    forecast.push(dayData);
  });

  return { location, current, forecast };
};

function displaySearch() {
  const container = document.querySelector(".container");
  container.innerHTML = "";
  container.appendChild(createSearchBarElement());
  container.querySelector("input[type='text']").classList.remove("hidden");
  container.appendChild(form);
}

const searchSubmitted = async function (event) {
  event.preventDefault();
  const searchStr = event.target.querySelector("input[type='text']").value;
  const weather = await getWeather(searchStr);
  if (weather) {
    displayWeather(weather);
  }
};

function displayWeather(weather) {
  const container = document.querySelector(".container");
  container.classList.add("expanded"); // for height transition
  // Remove all children except first
  while (container.childNodes.length > 1) {
    container.removeChild(container.lastChild);
  }
  // Display the weather
  container.appendChild(createCurrentWeatherElement(weather));
  container.appendChild(createHourlyForecastElement(weather));
  container.appendChild(createDailyForecastElement(weather));
  // Convert to celcius if necessary
  const unitSwitch = document
    .getElementById("search-bar")
    .querySelector("input[type='checkbox']");
  if (inCelcius(unitSwitch)) {
    convertPageTemps("c");
  }
}

// SEARCH BAR ELEMENT

function createSearchBarElement() {
  container = document.createElement("div");
  container.id = "search-bar";
  // Search icon
  container.innerHTML = `
    <img src="./assets/search.svg">
  `;
  // Input field
  const form = document.createElement("form");
  form.innerHTML = `
          <input
            type="text"
            name="search"
            class="hidden"
            id="search-input"
            placeholder="Search for a city or airport"
            required
          />
        `;
  container.appendChild(form);
  container.querySelector("img").addEventListener("click", toggleSearchHidden);
  form.addEventListener("submit", (e) => {
    searchSubmitted(e);
    form.querySelector("#search-input").classList.add("hidden");
  });

  // Degrees C/F switch
  container.appendChild(createDegUnitSwitch());

  return container;
}

function createDegUnitSwitch() {
  const container = document.createElement("div");
  container.classList.add("switch-container");
  container.innerHTML = `
    <div>℉</div>
    <label class="switch">
      <input type="checkbox">
      <span class="slider round"></span>
    </label>
    <div>℃</div>
  `;
  container
    .querySelector("input[type='checkbox']")
    .addEventListener("change", (e) => degUnitSwitchUpdated(e));
  return container;
}

function degUnitSwitchUpdated(e) {
  if (inCelcius(e.target)) {
    convertPageTemps("c");
  } else {
    convertPageTemps("f");
  }
}

function inFarenheit(unitSwitch) {
  return !unitSwitch.checked;
}

function inCelcius(unitSwitch) {
  return unitSwitch.checked;
}

function toggleSearchHidden() {
  const search = document.querySelector("#search-input");
  search.classList.toggle("hidden");
}

// CURRENT WEATHER

function createCurrentWeatherElement(weather) {
  const container = document.createElement("div");
  container.id = "current-container";
  container.innerHTML = `
    <div id="location">${weather.location.name}, ${
    weather.location.region
  }</div>
    <div id="country">${weather.location.country}</div>
    <div id="current-temp" class="temp">${Math.round(
      weather.current.temp_f
    )}°</div>
    <img src="${weather.current.condition.icon}">
    <div id="current-condition">${weather.current.condition.text}</div>
  `;
  return container;
}

// HOURLY FORECAST

function createHourlyForecastElement(weather) {
  // Create container
  const container = document.createElement("div");
  container.classList.add("weather-container");
  container.id = "hourly-container";

  // Add a card for the weather now
  const nowCard = createHourCard(
    "Now",
    weather.current.condition.icon,
    weather.current.temp_f
  );
  container.appendChild(nowCard);

  // Add hourly weather for next 23 hours
  const next23Hours = getNext23Hours(weather);
  next23Hours.forEach((hour) => {
    const date = new Date(hour.time);
    const card = createHourCard(
      date.getHours(),
      hour.condition.icon,
      hour.temp_f
    );
    container.appendChild(card);
  });
  return container;
}

function createHourCard(hour, icon, temp_f) {
  const timeStr = hourToTimeStr(hour);
  const card = document.createElement("div");
  card.classList.add("hour-card");
  card.innerHTML = `
    <div class="hour-time">${timeStr}</div>
    <img src="https:${icon}">
    <div class="temp hour-temp">${Math.round(temp_f)}°</div>
  `;
  return card;
}

function hourToTimeStr(hour) {
  if (hour == "Now") {
    return "Now";
  } else if (hour == 0) {
    return "12AM";
  } else if (hour < 12) {
    // AM
    return hour + "AM";
  } else if (hour == 12) {
    return "12PM";
  } else {
    // PM
    return hour - 12 + "PM";
  }
}

function getNext23Hours(weather) {
  const datenow = new Date(weather.location.local_time);
  const currentHour = datenow.getHours();
  const todayHourly = weather.forecast[0].hour;
  const tomorrowHourly = weather.forecast[1].hour;
  const bothHourly = todayHourly.concat(tomorrowHourly);
  const next23Hours = [];
  for (let dHr = 1; dHr < 24; dHr++) {
    next23Hours.push(bothHourly[currentHour + dHr]);
  }
  return next23Hours;
}

// DAILY FORECAST

function createDailyForecastElement(weather) {
  // Get min/max temps over all days
  const days = weather.forecast;
  const minLow = days.reduce(
    (acc, curr) =>
      Math.round(curr.mintemp_f) < acc ? Math.round(curr.mintemp_f) : acc,
    500
  );
  const maxHigh = days.reduce(
    (acc, curr) =>
      Math.round(curr.maxtemp_f) > acc ? Math.round(curr.maxtemp_f) : acc,
    -500
  );
  // Create the element and add daily cards
  container = document.createElement("div");
  container.classList.add("weather-container");
  container.id = "daily-container";
  days.forEach((day) => {
    container.appendChild(
      createDailyCard(
        dayStr(strToDate(day.date)),
        day.condition.icon,
        day.mintemp_f,
        day.maxtemp_f,
        minLow,
        maxHigh
      )
    );
  });
  return container;
}

function createDailyCard(dayStr, icon, low, high, minLow, maxHigh) {
  // Get parameters for the temp bar
  const leftOffset = low - minLow;
  const rightOffset = maxHigh - high;
  const leftOffsetPct = Math.floor((leftOffset / (maxHigh - minLow)) * 100);
  const rightOffsetPct = Math.floor((rightOffset / (maxHigh - minLow)) * 100);
  // Create the element
  const card = document.createElement("div");
  card.classList.add("daily-card");
  card.innerHTML = `
    <div class="day-str">${dayStr}</div>
    <img src="https:${icon}">
    <div class="low-high-container">
      <div class="temp">${Math.round(low)}°</div>
      <div class="temp-bar-container">
        <div class="temp-bar" style="padding-left:${leftOffsetPct}%; padding-right:${rightOffsetPct}%;">
          <div class="temp-bar-fill"></div>
        </div>
      </div>
      <div class="temp">${Math.round(high)}°</div>
    </div>
  `;
  return card;
}

function strToDate(dateStr) {
  // Reorder the date so Date() returns the right date!
  [yyyy, mm, dd] = dateStr.split("-");
  return new Date(`${mm}-${dd}-${yyyy}`);
}

function dayStr(date) {
  if (isToday(date)) {
    return "Today";
  }
  const dayInt = date.getDay();
  const dayMap = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return dayMap[dayInt];
}

function isToday(date) {
  const now = new Date();
  return (
    now.getFullYear() == date.getFullYear() &&
    now.getMonth() == date.getMonth() &&
    now.getDate() == date.getDate()
  );
}

function convertPageTemps(unit) {
  const allTemps = document.querySelectorAll(".temp");
  for (i = 0; i < allTemps.length; i++) {
    const tempEl = allTemps[i];
    const temp = parseInt(tempEl.innerText);
    let newTemp = temp;
    if (unit.toLowerCase() === "f") {
      newTemp = convertC2F(temp);
    } else if (unit.toLowerCase() === "c") {
      newTemp = convertF2C(temp);
    } else {
      console.log("Error: Improper degree unit supplied to converter");
    }
    tempEl.innerText = Math.round(newTemp) + "°";
  }
}

function convertF2C(degreesF) {
  return ((degreesF - 32) * 5) / 9;
}

function convertC2F(degreesC) {
  return Math.round((degreesC * 9) / 5) + 32;
}

displaySearch();
