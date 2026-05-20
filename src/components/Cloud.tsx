/**
 * Cloud — fixed background layers + canvas hosting the particle fog.
 *
 * Renders the depth gradient and the canvas with id="cloud-canvas".
 * The actual cloud engine is wired in useWheelNavigation, which finds
 * the canvas by id and mounts createCloud onto it.
 */
export function Cloud() {
  return (
    <>
      <div className="bg-base" />
      <div className="bg-depth" />
      <div className="bg-layer bg-cloud">
        <canvas id="cloud-canvas" />
      </div>
    </>
  );
}
