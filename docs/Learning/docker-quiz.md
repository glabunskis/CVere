# Docker Self-Assessment

A quiz on Docker as a technology, with my answers and the assessment/corrections.

Date: 2026-07-01

---

## Fundamentals

### 1. What is the difference between an image and a container?

**My answer:** Container is a small instance of a system: mini Linux OS for which all required software is installed and where the image runs. Image is an actual application run instance compiled from my code.

**Assessment: Reversed.**
The *image* is the static, read-only template (built from the Dockerfile: OS libs + compiled app + config). The *container* is a running (or stopped) instance of an image, with a writable layer on top. Analogy: image = class, container = object. Many containers can run from one image.

### 2. What is a Docker layer, and why does layer caching matter for build speed?

**My answer:** A Docker layer is a concept that caches the artifacts of already composed and built containers that Docker reuses when running new containers for the same project. Caching avoids full load of the required libraries anew every time.

**Assessment: Partial.**
A layer isn't a "cached built container." Each Dockerfile instruction (`RUN`, `COPY`, etc.) creates one image layer. Layers are stacked and content-addressed. On rebuild, Docker reuses a cached layer if that instruction *and everything before it* is unchanged. That's why `COPY package.json` + `npm ci` come before `COPY . .` — editing source doesn't bust the dependency layer.

### 3. What does a `.dockerignore` file do, and why does it affect build performance and security?

**My answer:** It lists the files that Docker does not visit when building. Important so that no sensitive data leaks into the build.

**Assessment: Correct.**
Also: it shrinks the build context sent to the daemon (faster builds) and keeps junk like `node_modules`/`.git` out.

---

## Dockerfile

### 4. Difference between `CMD` and `ENTRYPOINT`? When would you use each?

**My answer:** Don't know. Assume CMD is a command for assignment, while ENTRYPOINT is where the code expects the run start from.

**Assessment: Mostly not known.**
- `ENTRYPOINT` = the executable that always runs; the fixed "program."
- `CMD` = default arguments (or default command) that are easy to override at `docker run`.
- Common pattern: `ENTRYPOINT ["node"]` + `CMD ["server.js"]`. Running `docker run img app.js` overrides `CMD` -> `node app.js`. Using only `CMD ["node","server.js"]` (our setup) makes the whole command overridable. Use `ENTRYPOINT` when the container is essentially one fixed tool.

### 5. Difference between `COPY` and `ADD`?

**My answer:** Don't know. Assume COPY is for adding something that already exists, while ADD is for something new.

**Assessment: Wrong guess.**
Both copy files into the image. Difference: `ADD` can also fetch a remote URL and auto-extract local tar archives. Best practice: prefer `COPY` (predictable); use `ADD` only when you specifically want tar auto-extraction.

### 6. What is a multi-stage build and what problem does it solve?

**My answer:** A gradual run of the build; ensures a specific part is already done before further work depends on it, avoiding concurrent execution problems.

**Assessment: Partial, wrong reasoning.**
Not about concurrency. It's multiple `FROM` stages in one Dockerfile where a later stage copies only needed artifacts from an earlier one. Purpose: the final image excludes build-time tooling (compilers, dev deps, source). In our file: `deps`/`builder` have full `node_modules` + source; the `runner` stage copies only `.next/standalone` + `.next/static`. Result: smaller, more secure image.

### 7. Why did we set a non-root `USER` in the runtime stage?

**My answer:** No idea.

**Assessment: Not known.**
Containers run as root by default. If an attacker breaks out of the app, root inside the container is a bigger risk (and closer to host escalation). Running as an unprivileged user (`nextjs`) is least-privilege defense-in-depth — a standard production hardening step.

### 8. `ARG` vs `ENV`: which is available at build time vs runtime?

**My answer:** ARG is passed for build and ENV is used in the runtime.

**Assessment: Correct, with nuance.**
`ARG` = build-time only, not present in the running container. `ENV` = set in the image and available at runtime (and during build after it's set). Key subtlety: `NEXT_PUBLIC_*` must be `ARG` at build time because Next inlines them into the client bundle during `next build`; server-only secrets are runtime env.

---

## Runtime & networking

### 9. What's the difference between `-p 3000:3000` and `EXPOSE 3000`?

**My answer:** Assume there is no difference.

**Assessment: Wrong, important.**
`EXPOSE` is documentation/metadata — declares a port but publishes nothing. `-p 3000:3000` (or Compose `ports:`) actually publishes the container port to the host so it's reachable from your machine. Without `-p`/`ports`, `EXPOSE` alone does not make the app reachable from outside.

### 10. `docker compose up` vs `docker compose up -d`?

**My answer:** `-d` makes a detached build, but don't know what it means.

**Assessment: Partial.**
`-d` = detached: runs in the background and returns your terminal. Plain `up` runs in the foreground attached to logs, and stops the containers on Ctrl+C (why the app died earlier). "Detached" = not tied to your terminal session.

### 11. How do containers on the same Compose network reach each other, and by what name?

**My answer:** Assume via container id, possibly using the open ports.

**Assessment: Partial.**
On a shared Compose network, containers reach each other by **service name** as a DNS hostname, using the container's *internal* port — not published host ports and not container ID. E.g. `http://web:3000`. Published ports (`-p`) are only for host->container access.

---

## Data & lifecycle

### 12. Difference between a volume and a bind mount? When do you use each?

**My answer:** No idea.

**Assessment: Not known.**
Both persist/share data beyond the container's writable layer.
- **Bind mount**: maps a specific host path into the container (e.g. source dir for live dev). Tied to host filesystem layout.
- **Volume**: Docker-managed storage, not tied to a host path. Preferred for databases/persistent app data — portable and managed by Docker.

### 13. If you `docker compose down`, what happens to your data? What about `down -v`?

**My answer:** The container shuts down, data stays on it; with `-d` it deletes the container and removes the data.

**Assessment: Mixed up (`-d` conflated with `-v`).**
`docker compose down` stops and *removes* containers and networks, but named volumes survive. `docker compose down -v` also deletes volumes (data gone). `-d` (detached, at `up`) is unrelated to `-v` (volumes, at `down`).

### 14. Difference between stopping and removing a container?

**My answer:** Stopping allows later restart, all data stays; removing completely deletes everything about the container.

**Assessment: Correct.**
Stop = container persists (writable layer intact), can `start` again. Remove (`rm`) = deletes the container and its writable layer; anything not in a volume is lost.

---

## Images & registries

### 15. What does a tag like `node:22-alpine` mean, and why prefer `alpine`? Any downside?

**My answer:** Sets which Node version to run. Assume alpine is a lighter version with less capabilities.

**Assessment: Correct direction.**
`node` = image repo, `22` = Node major version, `alpine` = base OS variant (Alpine Linux, tiny, musl libc). Upside: small image. Downsides: musl (not glibc) can break some native binaries, and it lacks common tools — which is why we added `libc6-compat` for `sharp`.

### 16. How would you get a smaller image besides multi-stage builds?

**My answer:** Fetch preset package-lock so it would not download whole libraries.

**Assessment: Partial.**
`npm ci` uses the lockfile but still installs full deps. Real size levers: multi-stage builds, a slim/alpine base, `--omit=dev` / prune dev deps in the final stage, fewer/combined `RUN` layers, and `.dockerignore`. Next's `standalone` output is a big one — ships only traced runtime deps.

---

## Conceptual / architectural

### 17. How does a container differ from a virtual machine?

**My answer:** Assume a container is technically a VM set up for a specific project with all software pre-installed.

**Assessment: Common misconception.**
A container is **not** a VM. A VM virtualizes hardware and runs its own full guest kernel via a hypervisor (heavy, GBs, slow boot). A container shares the **host kernel** and is just isolated processes (namespaces + cgroups) — lightweight, MBs, starts in ms.

### 18. Docker builds Linux images. On your Windows machine, how is that possible?

**My answer:** It uses Windows Subsystem for Linux, basically a virtual machine.

**Assessment: Correct.**
Docker Desktop runs a lightweight Linux VM via WSL 2; Linux containers share that VM's kernel.

### 19. Where should secrets like `SUPABASE_SERVICE_ROLE_KEY` live, and why is baking them into an image with `ENV` bad?

**My answer:** They should live in compose as args so they don't get into the image. Baking them in could cause a leak of sensitive files.

**Assessment: Partial / risky wording.**
Correct that they must not be baked into the image. But build `args` get baked into image layers and are inspectable via image history — bad for secrets. Server secrets go in `env_file`/runtime `environment`, injected only into the running container. Only non-secret `NEXT_PUBLIC_*` values are build `args`. For production: Docker/BuildKit secrets or an external secrets manager.

---

## Scorecard

- **Solid:** 3, 8, 14, 15, 18
- **Half-right:** 2, 6, 10, 11, 16, 19
- **Re-study (highest value):** 1 (image vs container), 9 (`-p` vs `EXPOSE`), 12 (volumes), 17 (container vs VM)
