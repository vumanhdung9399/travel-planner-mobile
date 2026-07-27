export interface TripRoute {
  id: string;
  name: string;
  routerFileName: string;
  active: boolean;
}

export interface RouteData {
  id: string | number;
  name: string;
  waypoints: { lat: number; lng: number }[];
  path?: { lat: number; lng: number }[];
  travelMode?: "DRIVING" | "MOTORCYCLE";
  distance?: number;
  duration?: number;
  createdAt?: string;
}
