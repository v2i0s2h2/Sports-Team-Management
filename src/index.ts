// Add type declarations for imports
import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Principal,
  Result,
  match,
  Vec,
  nat64,
  ic,
  Opt,
} from "azle";

import { v4 as uuidv4 } from "uuid";

// Define interfaces for Team and Player
interface TeamData {
  id: string;
  owner: Principal;
  name: string;
  sportType: string;
  roster: Vec<Player>;
  createdAt: nat64;
  updatedAt: Date | null;
}

interface Player {
  name: string;
  position: string;
  statistics: Statistics;
}

interface Statistics {
  goalsScored: number;
  assists: number;
  personalRecords: Vec<string>;
}

// Use the defined interfaces for Team and Player
const teamStorage = new StableBTreeMap<string, TeamData>(0, 44, 1024);

// Function that allows coaches to create teams;
$update
export function createTeam(
  name: string,
  sportType: string,
  roster: Vec<Player>
): Result<TeamData, string> {
  if (!name || !sportType || !roster) {
    return Result.Err<TeamData, string>(`Invalid input parameters`);
  }

  const existingTeam = teamStorage.values().find((team) => team.name === name);
  if (existingTeam) {
    return Result.Err<TeamData, string>(`Team with name ${name} already exists`);
  }

  let id = uuidv4();
  while (teamStorage.get(id)) {
    id = uuidv4();
  }

  const team: TeamData = {
    id,
    owner: ic.caller(),
    name,
    sportType,
    roster,
    createdAt: ic.time(),
    updatedAt: null,
  };

  try {
    // Update the team in the storage;
    teamStorage.insert(team.id, team);
    return Result.Ok<TeamData, string>(team);
  } catch (error) {
    return Result.Err<TeamData, string>("Failed to insert team");
  }
}

// Function to fetch a particular team;
// returns an error message if team with id isn't found;
$query
export function getTeam(id: string): Result<TeamData, string> {
  return match(teamStorage.get(id), {
    Some: (team) => Result.Ok<TeamData, string>(team),
    None: () => Result.Err<TeamData, string>(`Team with id=${id} not found`),
  });
}

// Function that allows the author/coach of a team to edit the team;
$update
export function updateTeam(
  id: string,
  roster: Vec<Player>
): Result<TeamData, string> {
  return match(teamStorage.get(id), {
    Some: (team) => {
      // if caller isn't the team's owner, return an error;
      if (team.owner.toString() !== ic.caller().toString()) {
        return Result.Err<TeamData, string>("You are not the team's coach");
      }
      team.roster = roster;
      team.updatedAt = null;
      // Update the team in the storage;
      teamStorage.insert(team.id, team);
      return Result.Ok<TeamData, string>(team);
    },
    None: () => Result.Err<TeamData, string>(`Team with id=${id} not found`),
  });
}

// Function that allows the author/coach of a team to delete the team;
$update
export function deleteTeam(id: string): Result<void, string> {
  return match(teamStorage.get(id), {
    Some: (delete_team) => {
      // if caller isn't the team's owner, return an error;
      if (delete_team.owner.toString() !== ic.caller().toString()) {
        return Result.Err<void, string>("You are not the team's coach");
      }
      teamStorage.remove(id);
      return Result.Ok<void, string>();
    },
    None: () => Result.Err<void, string>(`Cannot Delete this Team id=${id}.`),
  });
}

// Function to fetch all teams;
$query
export function getAllTeams(): Result<Vec<TeamData>, string> {
  try {
    return Result.Ok<Vec<TeamData>, string>(teamStorage.values());
  } catch (error) {
    return Result.Err<Vec<TeamData>, string>(`Failed to fetch teams: ${error}`);
  }
}

// Function that allows coaches to add a player to the team;
$update
export function addPlayerToTeam(
  id: string,
  player: Player
): Result<TeamData, string> {
  return match(teamStorage.get(id), {
    Some: (team) => {
      // if caller isn't the team's owner, return an error
      if (team.owner.toString() !== ic.caller().toString()) {
        return Result.Err<TeamData, string>("You are not the team's coach");
      }

      const newPlayer: Player = {
        name: player.name,
        position: player.position,
        statistics: {
          goalsScored: player.statistics.goalsScored,
          assists: player.statistics.assists,
          personalRecords: player.statistics.personalRecords,
        },
      };

      const updatedTeam: TeamData = {
        ...team,
        roster: [...team.roster, newPlayer],
        updatedAt: null,
      };

      // Update the team in the storage;
      teamStorage.insert(team.id, updatedTeam);
      return Result.Ok<TeamData, string>(updatedTeam);
    },
    None: () => Result.Err<TeamData, string>(`Team with id=${id} not found`),
  });
}

// Function that allows coaches to delete a player from the team;
$update
export function deletePlayerFromTeam(
  id: string,
  playerName: string
): Result<TeamData, string> {
  return match(teamStorage.get(id), {
    Some: (team) => {
      // if caller isn't the team's owner, return an error;
      if (team.owner.toString() !== ic.caller().toString()) {
        return Result.Err<TeamData, string>("You are not the team's coach");
      }

      // Find the index of the player to delete in the roster;
      const playerIndex = team.roster.findIndex(
        (player) => player.name === playerName
      );
      if (playerIndex === -1) {
        return Result.Err<TeamData, string>(
          `Player ${playerName} not found in the team's roster`
        );
      }

      // Create a new roster without the player to be deleted;
      const updatedRoster = team.roster.filter(
        (player) => player.name !== playerName
      );

      // Create the updated team object with the new roster;
      const updatedTeam: TeamData = {
        ...team,
        roster: updatedRoster,
        updatedAt: null,
      };

      // Update the team in the storage;
      teamStorage.insert(team.id, updatedTeam);

      return Result.Ok<TeamData, string>(updatedTeam);
    },
    None: () => Result.Err<TeamData, string>(`Team with id=${id} not found`),
  });
}

globalThis.crypto = {
  //@ts-ignore
  getRandomValues: () => {
    let array = new
globalThis.crypto = {
  //@ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};

// Continue with the rest of the code...

// ... Existing code ...

// Function that allows coaches to add a player to the team;
$update
export function addPlayerToTeam(
  id: string,
  player: Player
): Result<TeamData, string> {
  // ... Existing code ...
}

// Function that allows coaches to delete a player from the team;
$update
export function deletePlayerFromTeam(
  id: string,
  playerName: string
): Result<TeamData, string> {
  // ... Existing code ...
}
