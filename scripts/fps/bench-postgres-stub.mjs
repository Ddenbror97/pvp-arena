// The runtime bench never reaches Hyperdrive (no HYPERDRIVE binding): the session reader falls
// back to its REST path. This stands in for the Node-only driver so the Worker bundles.
export default function postgres() {
  throw new Error("postgres is not available in the runtime benchmark");
}
