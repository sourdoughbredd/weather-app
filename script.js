const API_KEY = "63ed6dc9eafb4c5786e153351231112";

const apiRequest = async function (url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (e) {
    handleApiError(e);
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

function handleApiError(e) {
  alert("ERROR");
  console.log(e);
}

const getWeather = async function (searchStr) {
  const currentResp = await fetchCurrentWeather(searchStr);
  const forecastResp = await fetchForecastWeather(searchStr);
  // Extract location
  const location = {
    name: currentResp.location.name,
    region: currentResp.location.region,
    country: currentResp.location.country,
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
  const form = document.createElement("form");
  form.innerHTML = `
          <input
            type="text"
            name="search"
            id="search-input"
            placeholder="Search for a city or airport"
            required
          />
        `;
  form.addEventListener("submit", (e) => searchSubmitted(e));
  container.appendChild(form);
}

const searchSubmitted = async function (event) {
  event.preventDefault();
  const searchStr = event.target.querySelector("input[type='text']").value;
  const weather = await getWeather(searchStr);
  displayWeather(weather);
};

function displayWeather(weather) {
  console.log(weather);
  const container = document.querySelector(".container");
  container.innerHTML = "";
  container.appendChild(createCurrentWeatherElement(weather));
  container.appendChild(createHourlyForecastElement(weather));
  container.appendChild(createDailyForecastElement(weather));
}

// CURRENT WEATHER

function createCurrentWeatherElement(weather) {
  const container = document.createElement("div");
  container.classList.add("weather-container");
  container.id = "current-container";
  container.innerHTML = `
    <div id="location">${weather.location.name}, ${
    weather.location.region
  }</div>
    <div id="country">${weather.location.country}</div>
    <div id="current-temp">${Math.round(weather.current.temp_f)}</div>
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
    <div class="temp hour-temp">${Math.round(temp_f)}</div>
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
  const datenow = new Date();
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
  container.id = "daily-container";
  days.forEach((day) => {
    const date = new Date(day.date);
    container.appendChild(
      createDailyCard(
        dayStr(date),
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
      <div>${Math.round(low)}</div>
      <div class="temp-bar-container">
        <div class="temp-bar" style="padding-left:${leftOffsetPct}%; padding-right:${rightOffsetPct}%;">
          <div class="temp-bar-fill"></div>
        </div>
      </div>
      <div>${Math.round(high)}</div>
    </div>
  `;
  return card;
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

displaySearch();