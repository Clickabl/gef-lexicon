# Queue execution note

The Being research files and Task envelopes are ready for the official Agent Review Queue.

As of this commit, Gef's autonomous agent executor is not yet implemented. GitHub `TASK —` issues are therefore the durable current queue seeds/human-inbox representation. Creating a Task means the assignment is prepared and queued; it does not falsely claim a background agent has already executed it.

When the executor is implemented, migrate/claim these Tasks through `grammar.being.v1` without changing their research/output contracts.
