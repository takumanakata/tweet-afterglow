# Rubric for the AI pass (keep / delete)

## Who this account belongs to

{{PROFILE}}

## Policy

**Delete everything by default. Keep only achievements and announcements of the author's own work.**
When unsure, delete. Ask: "would this post still be a plus if it stayed public for years?"

## keep (category names)

| c | what | examples |
|---|---|---|
| `achievement` | being selected, awarded, accepted, interviewed, covered | "I was selected for X", "won Y", "Z interviewed me" |
| `announce` | announcements of the author's own exhibitions, talks, performances, workshops, broadcasts, releases | "performing at X tomorrow", "my solo show opens", "I'm teaching a workshop at Y" |
| `work` | presenting the author's own finished work / project, with a link, video or image | "new piece 'X' is out https://vimeo.com/...", "uploaded my VJ set" |
| `milestone` | career milestones | new job, going independent, founding a company, moving abroad, starting/ending a residency |
| `press` | the author's work featured in an article, interview or media | "my project is covered in X", "interview is up" |

## delete (category names)

| c | what |
|---|---|
| `reaction` | reactions to other people's work, events or news ("this is amazing", "went to see X") |
| `share` | sharing other people's articles, videos, tools (not the author's own work) |
| `casual` | daily life, mood, chatter, jokes, food, travel, health |
| `wip` | work-in-progress notes, tech notes, "got it working" (not a finished-work release) |
| `opinion` | opinions, critique, industry talk, politics, complaints, resolutions |
| `event_attend` | attending an event as audience (not as performer / speaker) |
| `other` | anything else with no reason to keep |

## Notes

- "Made this" / "got it working" alone is not `work`. Only when it is presented as finished work (title, link, video, exhibition name). Tests and experiments are `wip` -> delete.
- Promoting other people's events is `share` -> delete. Events where the author performs, speaks, teaches or exhibits are `announce` -> keep. "I'm going to X" is `event_attend` -> delete.
- A high like count alone is not a reason to keep.
- Anything negative, aggressive, embarrassing, about other people, private, or likely to age badly: always delete, even if it is also an achievement.
- Posts mentioning the blocked users / patterns from config: always delete (the rule pass already removes them; double-check).
- Early posts (student / junior years) deserve a stricter eye. Many "finished a piece" posts are `wip` unless they name a work, link or venue.
- Apply the same standard in every language.
- When unsure, delete.

## Output format

For **every** line of `in_XX.jsonl`, write one line to `out_XX.jsonl`, in the same order. One JSON object per line, these keys only:

```
{"id": "<the input id, as a string>", "d": "keep" | "delete", "c": "<category from above>", "r": "<if keep: reason in <= 20 chars; if delete: empty string>"}
```

- Input and output must have the same number of lines (no gaps, no duplicates).
- Write nothing else.
