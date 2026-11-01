"""Small numpy mesh builders shared by the accessory scripts (grids, lathes, sweeps)."""
import numpy as np
import bpy


class MeshData:
    def __init__(self):
        self.v = []  # (n,3) arrays
        self.f = []  # list of index tuples
        self.uv = []  # per-face list of (u,v) per corner
        self.mat = []
        self.smooth = []
        self.count = 0

    def add(self, verts, faces, uvs, mat=0, smooth=True):
        verts = np.asarray(verts, float)
        self.v.append(verts)
        for face, uv in zip(faces, uvs):
            self.f.append(tuple(int(i) + self.count for i in face))
            self.uv.append(uv)
            self.mat.append(mat)
            self.smooth.append(smooth)
        self.count += len(verts)
        return self

    def grid(self, P, U, mat=0, closed_u=False, closed_v=False, smooth=True, flip=False):
        """P: (nv, nu, 3) points, U: (nv, nu, 2) uvs. Quads between neighbours."""
        nv, nu = P.shape[:2]
        idx = np.arange(nv * nu).reshape(nv, nu)
        faces, uvs = [], []
        for i in range(nv - 1 + int(closed_v)):
            for j in range(nu - 1 + int(closed_u)):
                i1, j1 = (i + 1) % nv, (j + 1) % nu
                quad = [idx[i, j], idx[i, j1], idx[i1, j1], idx[i1, j]]
                uq = [U[i, j], U[i, j1], U[i1, j1], U[i1, j]]
                if flip:
                    quad, uq = quad[::-1], uq[::-1]
                faces.append(quad)
                uvs.append([tuple(x) for x in uq])
        return self.add(P.reshape(-1, 3), faces, uvs, mat, smooth)

    def to_object(self, name, materials=(), collection=None):
        verts = np.concatenate(self.v) if self.v else np.zeros((0, 3))
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts.tolist(), [], self.f)
        me.update()
        uv_layer = me.uv_layers.new(name="UVMap")
        loop_uv = []
        for poly, uv in zip(me.polygons, self.uv):
            for k, li in enumerate(poly.loop_indices):
                uv_layer.data[li].uv = uv[k]
        me.polygons.foreach_set("material_index", self.mat)
        me.polygons.foreach_set("use_smooth", self.smooth)
        for m in materials:
            me.materials.append(m)
        o = bpy.data.objects.new(name, me)
        (collection or bpy.context.scene.collection).objects.link(o)
        return o


def lathe(profile, segments, angle0=0.0, axis_frame=None):
    """Revolve a (r, z) profile about +Z. Returns (P (n_prof, seg+1, 3), theta (seg+1,))."""
    profile = np.asarray(profile, float)
    th = angle0 + np.linspace(0, 2 * np.pi, segments + 1)
    r = profile[:, 0][:, None]
    z = profile[:, 1][:, None] * np.ones_like(th)[None]
    P = np.stack([r * np.cos(th)[None], r * np.sin(th)[None], z], -1)
    return P, th


def catmull(points, samples_per_seg=8, closed=False):
    pts = np.asarray(points, float)
    if closed:
        pts = np.concatenate([pts[-1:], pts, pts[:2]])
    else:
        pts = np.concatenate([pts[:1], pts, pts[-1:]])
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for k in range(samples_per_seg):
            t = k / samples_per_seg
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    if not closed:
        out.append(pts[-2])
    return np.array(out)


def sweep(path, side, section, closed_path=False):
    """Sweep a 2D section (m,2) along path (n,3); section x along `side`, y along the in-plane normal."""
    path = np.asarray(path, float)
    n = len(path)
    T = np.gradient(path, axis=0) if not closed_path else (np.roll(path, -1, 0) - np.roll(path, 1, 0))
    T /= np.linalg.norm(T, axis=-1, keepdims=True)
    S = np.broadcast_to(np.asarray(side, float), path.shape).copy()
    S -= np.einsum("ij,ij->i", S, T)[:, None] * T
    S /= np.linalg.norm(S, axis=-1, keepdims=True)
    Nrm = np.cross(T, S)
    section = np.asarray(section, float)
    P = path[:, None, :] + section[None, :, 0:1] * S[:, None, :] + section[None, :, 1:2] * Nrm[:, None, :]
    return P, T, S, Nrm


def arclength(path):
    d = np.linalg.norm(np.diff(path, axis=0), axis=-1)
    return np.concatenate([[0], np.cumsum(d)])
