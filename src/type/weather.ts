export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

export interface ForecastDay {
  date: string;
  temperatureMin: number;
  temperatureMax: number;
  precipitationProbability: number;
  weatherCode: number;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: ForecastDay[];
}
