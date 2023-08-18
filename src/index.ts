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

type Team = Record<{
  id: string;
  owner: Principal;
  name: string;
  sportType: string;
  roster: Vec<Player>;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

type TeamPayload = Record<{
  name: string;
  sportType: string;
  roster: Vec<Player>;
}>;

type Player = Record<{
  name: string;
  position: string;
  statistics: Statistics;
}>;

type playerPayload = Record<{
  id: string;
  player: Player;
}>;

type Statistics = Record<{
  goalsScored: number;
  assists: number;
  personalRecords: Vec<string>;
}>;

const teamStorage = new StableBTreeMap<string, Team>(0, 440, 1024);

//Function that allows coaches to create teams;
$update;
export function createTeam(payload: TeamPayload): Result<Team, string> {
  // Validate the payload before processing it
  if (!payload.name || !payload.sportType || !payload.roster) {
    return Result.Err<Team, string>("Invalid payload");
  }

  const existingTeam = teamStorage
    .values()
    .find((team) => team.name === payload.name);
  if (existingTeam) {
    return Result.Err<Team, string>(
      `Team with name ${payload.name} already exists`
    );
  }

  let id = uuidv4();

  const team: Team = {
    id,
    owner: ic.caller(),
    name: payload.name,
    sportType: payload.sportType,
    roster: payload.roster,
    createdAt: ic.time(),
    updatedAt: Opt.None,
  };

  try {
    // Update the team in the teamStorage;
    teamStorage.insert(team.id, team);
    return Result.Ok<Team, string>(team);
  } catch (error) {
    return Result.Err<Team, string>("Failed to insert team");
  }
}

// Function to fetch a particular team;
// returns an error message if team with id isn't found;
$query;
export function getTeam(id: string): Result<Team, string> {
  return match(teamStorage.get(id), {
    Some: (team) => Result.Ok<Team, string>(team),
    None: () => Result.Err<Team, string>(`Team with id=${id} not found`),
  });
}

// Function that allows the author/coach of a team to edit the team;
$update;
export function updateTeam(
  id: string,
  roster: Vec<Player>
): Result<Team, string> {
  return match(teamStorage.get(id), {
    Some: (team) => {
      // if caller isn't the tweet's owner, return an error;
      if (team.owner.toString() !== ic.caller().toString()) {
        return Result.Err<Team, string>("You are not the team's coach");
      }
      team.roster = roster;
      team.updatedAt = Opt.Some(ic.time());
      // Update the team in the storage;
      teamStorage.insert(team.id, team);
      return Result.Ok<Team, string>(team);
    },
    None: () => Result.Err<Team, string>(`Team with id=${id} not found`),
  });
}

// Function that allows the author/coach of a team to delete the team;
$update;
export function deleteTeam(id: string): Result<Team, string> {
  return match(teamStorage.get(id), {
    Some: (delete_team) => {
      // if caller isn't the team's coach, return an error;
      if (delete_team.owner.toString() !== ic.caller().toString()) {
        return Result.Err<Team, string>("You are not the team's coach");
      }
      teamStorage.remove(id);
      console.log(`Team with id=${id} has been deleted.`);
      return Result.Ok<Team, string>(delete_team);
    },
    None: () => Result.Err<Team, string>(`Cannot Delete this Team id=${id}.`),
  });
}

// Function to fetch all teams;
$query;
export function getAllTeams(): Result<Vec<Team>, string> {
  try {
    return Result.Ok(teamStorage.values());
  } catch (error) {
    return Result.Err(`Failed to fetch teams: ${error}`);
  }
}

// Function that allows coaches to add player on team;
$update;
export function addPlayerToTeam(payload: playerPayload): Result<Team, string> {
  return match(teamStorage.get(payload.id), {
    Some: (team) => {
      // if caller isn't the tweet's owner, return an error
      if (team.owner.toString() !== ic.caller().toString()) {
        return Result.Err<Team, string>("You are not the team's coach");
      }

      const newPlayer: Player = {
        name: payload.player.name,
        position: payload.player.position,
        statistics: {
          goalsScored: payload.player.statistics.goalsScored,
          assists: payload.player.statistics.assists,
          personalRecords: payload.player.statistics.personalRecords,
        },
      };

      const updatedTeam: Team = {
        ...team,
        roster: [...team.roster, newPlayer],
        updatedAt: Opt.Some(ic.time()),
      };

      // Update the team in the teamStorage;
      teamStorage.insert(team.id, updatedTeam);
      return Result.Ok<Team, string>(updatedTeam);
    },
    None: () =>
      Result.Err<Team, string>(`Team with id=${payload.id} not found`),
  });
}

// Function that allows coaches to delete player on team;
$update;
export function deletePlayerToTeam(
  id: string,
  playerName: string
): Result<Team, string> {
  return match(teamStorage.get(id), {
    Some: (team) => {
      // if caller isn't the team's coach, return an error;
      if (team.owner.toString() !== ic.caller().toString()) {
        return Result.Err<Team, string>("You are not the team's coach");
      }

      // Find the index of the player to delete in the roster;
      const playerIndex = team.roster.findIndex(
        (player) => player.name === playerName
      );
      if (playerIndex === -1) {
        return Result.Err<Team, string>(
          `Player ${playerName} not found in the team's roster`
        );
      }

      // Create a new roster without the player to be deleted;
      const updatedRoster = team.roster.filter(
        (player) => player.name !== playerName
      );

      // Create the updated team object with the new roster;
      const updatedTeam: Team = {
        ...team,
        roster: updatedRoster,
        updatedAt: Opt.Some(ic.time()),
      };

      // Update the team in the storage;
      teamStorage.insert(team.id, updatedTeam);

      return Result.Ok<Team, string>(updatedTeam);
    },
    None: () => Result.Err<Team, string>(`Team with id=${id} not found`),
  });
}

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
