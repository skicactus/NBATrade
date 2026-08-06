export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export interface Player {
  id: string;
  name: string;
  teamId: string;
  position: Position;
  age: number;
  overall: number;
  salary: number; // current season salary, USD
  contractYearsLeft: number;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  city: string;
}
