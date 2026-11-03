import { expect, test } from "bun:test";
import { searchProjects } from "./quick-search";

const projects = [
  { id: "a", project_name: "Wedding + Reception", venue: "Guruvayoor", clients: { name: "Swathi", phone: "+91 98470 12345" } },
  { id: "b", project_name: "Engagement", venue: "Calicut", clients: { name: "Rahul", phone: "9000011111" } },
];
const events = [{ project_id: "b", location: "Kannur Temple" }];

test("needs at least 2 letters", () => expect(searchProjects(projects, events, "s")).toEqual([]));
test("matches client, venue and event place", () => {
  expect(searchProjects(projects, events, "sw").map((p) => p.id)).toEqual(["a"]);
  expect(searchProjects(projects, events, "guruv").map((p) => p.id)).toEqual(["a"]);
  expect(searchProjects(projects, events, "kannur").map((p) => p.id)).toEqual(["b"]);
});
test("matches mobile ignoring spaces", () =>
  expect(searchProjects(projects, events, "9847012").map((p) => p.id)).toEqual(["a"]));
