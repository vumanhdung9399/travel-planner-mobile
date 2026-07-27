import type { WeatherData } from "@/src/type/weather";

interface GeocodingResponse {
  results?: { latitude: number; longitude: number }[];
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
  };
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
  return response.json() as Promise<T>;
};

export const geocodeLocation = async (location: string) => {
  const geo = await fetchJson<GeocodingResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      location,
    )}&count=1&language=vi&format=json`,
  );
  const place = geo.results?.[0];
  if (!place) throw new Error(`Không tìm thấy địa điểm "${location}"`);
  return place;
};

export const getWeatherByLocation = async (
  location: string,
  startDate: string,
  endDate: string,
): Promise<WeatherData> => {
  const place = await geocodeLocation(location);

  const today = new Date().toISOString().slice(0, 10);
  const forecastStart = startDate < today ? today : startDate.slice(0, 10);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 15);
  const forecastEnd = [
    endDate.slice(0, 10),
    maxDate.toISOString().slice(0, 10),
  ].sort()[0];

  const query = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "16",
  });

  const data = await fetchJson<OpenMeteoResponse>(
    `https://api.open-meteo.com/v1/forecast?${query}`,
  );

  return {
    current: {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      weatherCode: data.current.weather_code,
    },
    forecast: data.daily.time
      .map((date, index) => ({
        date,
        temperatureMin: Math.round(data.daily.temperature_2m_min[index]),
        temperatureMax: Math.round(data.daily.temperature_2m_max[index]),
        precipitationProbability:
          data.daily.precipitation_probability_max[index] || 0,
        weatherCode: data.daily.weather_code[index],
      }))
      .filter((day) => day.date >= forecastStart && day.date <= forecastEnd)
      .slice(0, 5),
  };
};
