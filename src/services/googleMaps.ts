import { ENV } from "@/src/constants/env";

export interface PlacePrediction {
  placeId: string;
  description: string;
}

interface AutocompleteResponse {
  status: string;
  predictions?: { place_id: string; description: string }[];
  error_message?: string;
}

interface PlaceDetailsResponse {
  status: string;
  result?: {
    geometry?: { location?: { lat: number; lng: number } };
  };
  error_message?: string;
}

const assertKey = () => {
  if (!ENV.GOOGLE_MAPS_API_KEY) {
    throw new Error("Thiếu GOOGLE_MAPS_API_KEY");
  }
};

export const searchGooglePlaces = async (
  input: string,
): Promise<PlacePrediction[]> => {
  assertKey();
  const params = new URLSearchParams({
    input,
    components: "country:vn",
    language: "vi",
    key: ENV.GOOGLE_MAPS_API_KEY,
  });
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
  );
  const data = (await response.json()) as AutocompleteResponse;
  if (!response.ok || !["OK", "ZERO_RESULTS"].includes(data.status)) {
    throw new Error(data.error_message || `Google Places: ${data.status}`);
  }
  return (data.predictions || []).map((prediction) => ({
    placeId: prediction.place_id,
    description: prediction.description,
  }));
};

export const getGooglePlaceLocation = async (placeId: string) => {
  assertKey();
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "geometry",
    language: "vi",
    key: ENV.GOOGLE_MAPS_API_KEY,
  });
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
  );
  const data = (await response.json()) as PlaceDetailsResponse;
  const location = data.result?.geometry?.location;
  if (!response.ok || data.status !== "OK" || !location) {
    throw new Error(data.error_message || `Google Places: ${data.status}`);
  }
  return { latitude: location.lat, longitude: location.lng };
};
