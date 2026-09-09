"""Build the eight nested, editable DMP portfolio worlds.

Usage: blender --background --factory-startup --python blender/build_nested.py -- --render
All lengths are artistic scene units. Blender uses Z-up; exported glTF uses Y-up.
"""
from pathlib import Path
import bpy
import bmesh
import math
import json
import sys
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / 'assets' / '3d'
PREVIEWS = HERE / 'previews'
OUT.mkdir(parents=True, exist_ok=True)
PREVIEWS.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = 'DMP | Escritorio a laboratorio'
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1600
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = 360
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('Ambiente | salvia')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.30, 0.39, 0.36, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.35
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.color_mode = 'RGB'
scene['description'] = 'Primera maqueta: escritorio, cubo 3x3 y laboratorio eléctrico. No es el portfolio terminado.'
scene['portal_frames'] = '180 / 181: corte oculto dentro del cubo y del conector'

def srgb(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

def rgba(hex_color):
    s = hex_color.lstrip('#')
    return tuple(srgb(int(s[i:i+2], 16) / 255) for i in (0, 2, 4)) + (1,)

def mat(name, color, rough=0.65, metal=0, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba(color)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = rgba(color)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emission:
        p.inputs['Emission Color'].default_value = rgba(color)
        p.inputs['Emission Strength'].default_value = emission
    return m

M = {
    'wood': mat('01 · Abedul cálido', '#c69769'),
    'edge': mat('02 · Cantos de madera', '#ad7950'),
    'cream': mat('03 · Marfil', '#ede8d9'),
    'sage': mat('04 · Salvia', '#a2b4a2'),
    'teal': mat('05 · Verde petróleo', '#36665f'),
    'navy': mat('06 · Grafito azulado', '#253537'),
    'screen': mat('07 · Pantalla oscura', '#142c2b', emission=0.1),
    'mint': mat('08 · Texto de pantalla', '#b7efd0', emission=0.6),
    'white_text': mat('09 · Texto marfil', '#f1f0e3', emission=0.35),
    'orange': mat('10 · Terracota', '#cc714f'),
    'yellow': mat('11 · Ámbar', '#e9b849'),
    'metal': mat('12 · Aluminio satinado', '#a0b3af', rough=0.4, metal=0.5),
    'rubber': mat('13 · Goma oscura', '#202725'),
    'floor': mat('14 · Fondo salvia claro', '#d5dfd2'),
    'red': mat('Cubo · Rojo', '#da5142', rough=0.42),
    'green': mat('Cubo · Verde', '#66b98a', rough=0.42),
    'blue': mat('Cubo · Azul', '#4486c5', rough=0.42),
    'cube_yellow': mat('Cubo · Amarillo', '#f3c64c', rough=0.42),
    'cube_orange': mat('Cubo · Naranja', '#ef8844', rough=0.42),
    'cube_white': mat('Cubo · Blanco', '#f7f4e8', rough=0.42),
    'leaf': mat('Planta · Hojas', '#527d53'),
    'soil': mat('Planta · Tierra', '#534331'),
}
black = mat('Portal · Negro sin reflejos', '#000000')
black.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0
M['black'] = black

font_regular = bpy.data.fonts.load('C:/Windows/Fonts/segoeui.ttf')
font_bold = bpy.data.fonts.load('C:/Windows/Fonts/segoeuib.ttf')
font_mono = bpy.data.fonts.load('C:/Windows/Fonts/consola.ttf')

active_collection = None
active_root = None

def collection(name, origin=(0, 0, 0)):
    global active_collection, active_root
    active_collection = bpy.data.collections.new(name)
    scene.collection.children.link(active_collection)
    active_root = bpy.data.objects.new(name + ' | raíz', None)
    active_collection.objects.link(active_root)
    active_root.location = origin
    return active_collection, active_root

def adopt(obj, name, material=None):
    obj.name = name
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    active_collection.objects.link(obj)
    obj.parent = active_root
    if material:
        obj.data.materials.append(M.get(material, material))
    return obj

def box(name, loc, dim, material, bevel=0.035, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = adopt(bpy.context.object, name, material)
    o.dimensions = dim
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('Bordes low poly', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    if rot:
        o.rotation_euler = rot
    return o

def cyl(name, loc, radius, depth, material, vertices=16, rotation=None, top=None):
    if top is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=top, depth=depth, location=loc)
    o = adopt(bpy.context.object, name, material)
    if rotation:
        o.rotation_euler = rotation
    return o

def rod(name, start, end, radius, material, vertices=10):
    a, b = Vector(start), Vector(end)
    o = cyl(name, (a+b)/2, radius, (b-a).length, material, vertices)
    o.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return o

def cable(name, points, material='rubber', radius=0.015, min_z=None):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 8
    curve.bevel_depth = radius
    curve.bevel_resolution = 1
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for p, co in zip(spline.bezier_points, points):
        p.co = co
        p.handle_left_type = 'AUTO'
        p.handle_right_type = 'AUTO'
    if min_z is not None:
        # A Bezier segment stays in the convex hull of its control points.
        # Clamp both handles as well as anchors so AUTO cannot dip into the ESD mat.
        for n, p in enumerate(spline.bezier_points):
            before = Vector(points[max(0, n-1)])
            after = Vector(points[min(len(points)-1, n+1)])
            tangent = (after-before)/(3 if n in (0, len(points)-1) else 6)
            left, right = p.co-tangent, p.co+tangent
            p.handle_left_type = p.handle_right_type = 'FREE'
            left.z = max(min_z, left.z)
            right.z = max(min_z, right.z)
            p.handle_left = left
            p.handle_right = right
            p.co.z = max(min_z, p.co.z)
    o = bpy.data.objects.new(name, curve)
    active_collection.objects.link(o)
    o.parent = active_root
    curve.materials.append(M[material])
    return o

def text(name, body, loc, size, material='navy', bold=False, flat=False, mono=False, align='LEFT'):
    data = bpy.data.curves.new(name, 'FONT')
    data.body = body
    data.size = size
    data.font = font_mono if mono else font_bold if bold else font_regular
    data.align_x = align
    data.space_line = 1.2
    data.extrude = 0
    data.resolution_u = 3
    obj = bpy.data.objects.new(name, data)
    active_collection.objects.link(obj)
    obj.parent = active_root
    obj.location = loc
    obj.rotation_euler = (0, 0, 0) if flat else (math.pi/2, 0, 0)
    data.materials.append(M[material])
    return obj

def light(name, loc, target, power, size, color):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    data.color = color
    o = bpy.data.objects.new(name, data)
    active_collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target)-o.location).to_track_quat('-Z', 'Y').to_euler()
    return o

desk_collection, desk_root = collection('01 · ESCRITORIO')
box('Isla | base biselada', (0, 0, -0.05), (8.0, 5.9, 0.28), 'sage', 0.17)
box('Alfombra de fieltro', (0, -0.05, 0.10), (6.9, 4.8, 0.055), 'teal', 0.14)
box('Tablero · abedul', (0, 0, 2.05), (6.6, 3.4, 0.20), 'wood', 0.085)
box('Canto inferior', (0, 0, 1.95), (6.38, 3.18, 0.075), 'edge', 0.05)
for x in (-2.8, 2.8):
    for y in (-1.12, 1.12):
        box('Pata de escritorio', (x, y, 1.00), (0.18, 0.18, 1.9), 'cream', 0.025)
        box('Protector de pata', (x, y, 0.15), (0.19, 0.19, 0.13), 'navy', 0.025)
box('Travesaño trasero', (0, 1.12, 0.52), (5.75, 0.10, 0.10), 'cream', 0.015)

# Monitor: text stays editable in the blend file, then is meshed for glTF export.
box('Monitor | base', (-0.35, 0.55, 2.22), (1.1, 0.65, 0.11), 'navy', 0.07)
box('Monitor | soporte', (-0.35, 0.76, 2.60), (0.18, 0.14, 0.78), 'metal', 0.025)
box('Monitor | carcasa', (-0.35, 0.70, 3.37), (2.94, 0.18, 1.73), 'navy', 0.09)
box('Monitor | pantalla', (-0.35, 0.601, 3.39), (2.72, 0.018, 1.48), 'screen', 0.03)
text('Monitor | terminal', 'david@portfolio:~', (-1.57, 0.585, 3.94), 0.115, 'mint', mono=True)
text('Monitor | saludo', "Hi, I'm", (-1.56, 0.582, 3.64), 0.20, 'white_text')
text('Monitor | nombre', 'David Martínez Palomares', (-1.56, 0.580, 3.37), 0.223, 'white_text', bold=True)
text('Monitor | software', 'Software development student', (-1.55, 0.578, 3.09), 0.16, 'mint')
text('Monitor | laboratorio', 'Laboratory analyst\nand project coordinator', (-1.55, 0.576, 2.88), 0.16, 'white_text')
cyl('Monitor | LED', (0.92, 0.595, 2.65), 0.018, 0.014, 'mint', 10, (math.pi/2, 0, 0))

box('Deskmat', (-0.15, -0.62, 2.17), (3.9, 1.26, 0.035), 'teal', 0.1)
box('Teclado | cuerpo', (-0.65, -0.65, 2.245), (2.0, 0.73, 0.11), 'cream', 0.055)
for row in range(4):
    for col in range(12):
        if row == 0 and 3 <= col <= 7:
            continue
        material = 'orange' if (row, col) in [(3, 0), (1, 11)] else 'sage' if col > 9 else 'cream'
        box('Tecla %02d-%02d' % (row, col), (-1.54+col*0.161, -0.91+row*0.174, 2.325), (0.14, 0.147, 0.067), material, 0.012)
box('Barra espaciadora', (-0.735, -0.91, 2.325), (0.77, 0.147, 0.067), 'sage', 0.015)
cable('Cable de teclado', [(-0.63, -0.22, 2.23), (-0.70, 0.04, 2.2), (-1.0, 0.20, 2.2), (-0.4, 0.61, 2.21)], radius=0.013)
box('Ratón | cuerpo', (1.19, -0.65, 2.285), (0.42, 0.67, 0.19), 'cream', 0.14)
box('Ratón | división', (1.19, -0.45, 2.387), (0.014, 0.22, 0.006), 'sage', 0.002)
box('Ratón | rueda', (1.19, -0.54, 2.395), (0.052, 0.12, 0.043), 'orange', 0.015)

# Minimal accessories, kept clear of the portal line.
box('Libreta | cubierta', (-2.42, -0.62, 2.20), (0.71, 1.01, 0.075), 'orange', 0.025, (0, 0, -0.13))
box('Libreta | páginas', (-2.42, -0.62, 2.25), (0.65, 0.94, 0.065), 'cream', 0.015, (0, 0, -0.13))
rod('Lápiz', (-2.67, -1.0, 2.31), (-2.30, -0.19, 2.31), 0.025, 'navy', 6)
cyl('Lámpara | base', (-2.5, 0.93, 2.20), 0.30, 0.10, 'teal')
rod('Lámpara | brazo inferior', (-2.5, 0.93, 2.25), (-2.7, 0.96, 3.23), 0.046, 'teal')
rod('Lámpara | brazo superior', (-2.7, 0.96, 3.23), (-2.22, 0.83, 3.75), 0.045, 'teal')
cyl('Lámpara | pantalla', (-2.18, 0.80, 3.71), 0.26, 0.25, 'teal', 16, top=0.10)
cyl('Lámpara | difusor', (-2.18, 0.80, 3.58), 0.23, 0.016, 'cream', 16)
cyl('Maceta', (2.56, 0.83, 2.40), 0.24, 0.48, 'cream', 12, top=0.32)
cyl('Tierra', (2.56, 0.83, 2.64), 0.29, 0.018, 'soil', 12)
for i in range(7):
    a = i * math.tau / 7
    end = (2.56+math.cos(a)*0.24, 0.83+math.sin(a)*0.24, 3.05+(i%3)*0.12)
    rod('Planta | tallo', (2.56, 0.83, 2.64), end, 0.012, 'leaf', 6)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=end)
    leaf = adopt(bpy.context.object, 'Planta | hoja facetada', 'leaf')
    leaf.scale = (0.12, 0.08, 0.31)
    leaf.rotation_euler = (0.3*math.cos(a), 0.6*math.sin(a), a)

# Exactly half of the previous outer edge, including the previous face caps.
# Closely fitted stickerless cubies: the portal comes from rounded internal
# longitudinal edges, not from spacing the complete layers apart.
PREVIOUS_CUBE_EDGE = 0.747
CUBE_EDGE = PREVIOUS_CUBE_EDGE * 0.5
STEP = CUBE_EDGE / 3
SEAM = 0.0006
CORNER_RADIUS = 0.026
CUBE = Vector((0.665, -0.65, 2.1875+CUBE_EDGE/2))
cube_pieces = []
for i in (-1, 0, 1):
    for j in (-1, 0, 1):
        for k in (-1, 0, 1):
            if (i, j, k) == (0, 0, 0):
                continue
            indices = (i, j, k)
            p = CUBE + Vector((i*STEP, j*STEP, k*STEP))
            bm = bmesh.new()
            bmesh.ops.create_cube(bm, size=STEP)
            for v in bm.verts:
                for axis in range(3):
                    side = 1 if v.co[axis] > 0 else -1
                    if indices[axis] != side:
                        v.co[axis] -= side*SEAM/2
            bm.normal_update()
            palette = ['rubber', 'green', 'blue', 'red', 'cube_orange', 'cube_white', 'cube_yellow']
            for face in bm.faces:
                axis = max(range(3), key=lambda d: abs(face.normal[d]))
                side = 1 if face.normal[axis] > 0 else -1
                if indices[axis] == side:
                    face.material_index = {(0, 1):1, (0, -1):2, (1, -1):3, (1, 1):4, (2, 1):5, (2, -1):6}[(axis, side)]
            internal_edges = []
            for edge in bm.edges:
                delta = edge.verts[1].co-edge.verts[0].co
                along = max(range(3), key=lambda d: abs(delta[d]))
                middle = (edge.verts[1].co+edge.verts[0].co)/2
                if all(abs(indices[d]+middle[d]/STEP) < 1.49 for d in range(3) if d != along):
                    internal_edges.append(edge)
            bmesh.ops.bevel(bm, geom=internal_edges, offset=CORNER_RADIUS,
                            segments=5, affect='EDGES', profile=0.5,
                            clamp_overlap=True, material=0)
            bm.normal_update()
            mesh = bpy.data.meshes.new('Cubo | pieza compacta')
            bm.to_mesh(mesh)
            bm.free()
            for name in palette:
                mesh.materials.append(M[name])
            obj = bpy.data.objects.new('Cubo | pieza %d %d %d' % indices, mesh)
            active_collection.objects.link(obj)
            obj.parent = desk_root
            obj.location = p
            obj['cell'] = list(indices)
            obj['inner_corner_radius'] = CORNER_RADIUS
            cube_pieces.append(obj)

# The rear/right middle cells are open. The first view still reads as a compact
# cube; its hidden side contains AIDIMME, with no opaque cap or transition card.
for obj in list(cube_pieces):
    i, j, k = obj['cell']
    if k == 0 and j >= 0 and i >= 0:
        bpy.data.objects.remove(obj, do_unlink=True)
desk_root['cube_edge'] = CUBE_EDGE
desk_root['design'] = 'Half-hollow speed cube, compact cells with rounded internal corners'
box('Cubo · revestimiento interior',(.607,-.575,2.374),(.001,.239,.122),'floor',0)

def fit(obj, width):
    bpy.context.view_layer.update()
    if obj.dimensions.x > width:
        obj.data.size *= width / obj.dimensions.x
    return obj

for key in ['nombre', 'software', 'laboratorio']:
    fit(bpy.data.objects['Monitor | '+key], 2.46)

M.update({
    'skin': mat('Personaje · piel', '#d9a681'),
    'hair': mat('Personaje · pelo castaño', '#473931'),
    'coat': mat('Bata · blanco cálido', '#f4f4ee'),
    'sand': mat('València · piedra caliza', '#d9b784'),
    'stone_edge': mat('València · molduras', '#b18b5c'),
    'holo': mat('Holograma · cian', '#5be5ed', emission=1.7),
    'xray': mat('Radiografía · fósforo', '#91cde7', emission=1.1),
    'pink': mat('Proyectos · coral', '#dc8399'),
})

worlds = [{'id':'desk', 'name':'01 · INTRO', 'collection':desk_collection, 'root':desk_root,
           'camera':[-0.35,-6.4,4.6], 'target':[-0.35,0.58,3.37],
           'portal':{'position':[0.65,-0.575,2.325], 'scale':0.018, 'rotation':math.pi/2},
           'role':'Laboratory analyst and project coordinator', 'company':'David Martínez Palomares',
           'years':'Software development student', 'hold':1.0}]

def start_world(wid, label, role, company, years, portal, camera=None, target=None, hold=1.1):
    col, root = collection(label)
    w = dict(id=wid, name=label, collection=col, root=root, role=role, company=company, years=years,
             portal=portal, camera=camera or [0,-9,4.8], target=target or [0,0,2.6], hold=hold)
    worlds.append(w)
    return w

def island(material='sage'):
    box('Isla · plataforma', (0,0,0), (6.6,4.2,0.22), material, 0.16)
    box('Isla · pavimento', (0,0,0.12), (6.28,3.88,0.045), 'cream', 0.10)

def title(role, company, years):
    # These are actual extruded, editable 3D titles, independent of scenery.
    for name, body, z, size, material in [
        ('Puesto',role,4.44,0.30,'navy'),
        ('Empresa',company,3.60,0.52,'teal'),
        ('Años',years,3.20,0.29,'orange')]:
        o = fit(text(name,body,(0,-0.10,z),size,material,bold=True,align='CENTER'),5.35)
        o.data.extrude = 0.012 if name == 'Empresa' else 0.006
        o.data.bevel_depth = 0.001
        o.data.space_line = 1.04

def sphere(name, loc, scale, material, sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc)
    obj=adopt(bpy.context.object,name,material)
    obj.scale=scale if hasattr(scale,'__len__') else (scale,)*3
    return obj

def mesh_object(name, vertices, faces, material):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    active_collection.objects.link(obj)
    obj.parent=active_root
    mesh.materials.append(M.get(material,material))
    return obj

def ring(name, center, outer, inner, depth, material='metal', n=32):
    c=Vector(center); vs=[]; fs=[]
    for yy,r in [(depth/2,outer),(-depth/2,outer),(-depth/2,inner),(depth/2,inner)]:
        for j in range(n):
            a=j*math.tau/n
            vs.append(c+Vector((r*math.cos(a),yy,r*math.sin(a))))
    for row in range(4):
        for j in range(n):
            fs.append((row*n+j,row*n+(j+1)%n,((row+1)%4)*n+(j+1)%n,((row+1)%4)*n+j))
    return mesh_object(name,vs,fs,material)

def person(name, origin, coat=True, pose='relaxed', yaw=0, scale=1):
    before=set(active_collection.objects)
    # Standing figure, about 2.55 units tall; deliberately stylised, editable parts.
    for x in [-0.16,0.16]:
        rod(name+' · pantalón',(x,0,0.28),(x,0.015,1.12),0.115,'navy',8)
        box(name+' · zapato',(x,-0.08,0.22),(0.25,0.42,0.15),'rubber',0.055)
    bodymat='coat' if coat else 'teal'
    body=box(name+' · bata' if coat else name+' · jersey',(0,0,1.40),(.68,.39,.90),bodymat,.09)
    if coat:
        box(name+' · camisa',(0,-.206,1.78),(.24,.018,.30),'teal',.007)
        for side in [-1,1]:
            mesh_object(name+' · solapa',[(side*.07,-.228,1.90),(side*.27,-.228,1.76),(side*.10,-.232,1.52)],[(0,1,2)],'cream')
            box(name+' · bolsillo',(side*.205,-.213,1.30),(.19,.025,.16),'cream',.01)
        for z in [1.53,1.38,1.23]:
            sphere(name+' · botón',(0,-.228,z),.019,'metal',1)
    cyl(name+' · cuello',(0,0,1.98),.105,.24,'skin',12)
    sphere(name+' · cabeza',(0,-.006,2.22),(.225,.21,.29),'skin')
    # A fitted low-poly hair cap instead of an entire second intersecting head.
    vs=[(0,0,2.537)]; fs=[]
    for r,z in [(.14,2.50),(.23,2.30)]:
        for i in range(12):
            a=math.tau*i/12
            vs.append((r*math.cos(a),r*.95*math.sin(a),z+(.08 if r>.2 and math.sin(a)<-.2 else 0)))
    for i in range(12):
        fs.append((0,i+1,(i+1)%12+1))
        fs.append((i+1,13+i,13+(i+1)%12,(i+1)%12+1))
    mesh_object(name+' · pelo',vs,fs,'hair')
    sphere(name+' · nariz',(0,-.216,2.22),(.055,.066,.065),'skin',1)
    for x in [-.078,.078]: sphere(name+' · ojo',(x,-.199,2.29),(.018,.018,.018),'navy',1)
    for side in [-1,1]:
        shoulder=(side*.32,0,1.78)
        elbow=(side*.48,-.07,1.35)
        hand=(side*.47,-.18,1.16)
        if pose in ('test','coordinate') and side==1:
            elbow=(.62,-.15,1.50); hand=(.85,-.43,1.53)
        rod(name+' · manga superior',shoulder,elbow,.125,bodymat,8)
        rod(name+' · manga inferior',elbow,hand,.105,bodymat,8)
        sphere(name+' · mano',hand,(.10,.09,.13),'skin',1)
    from mathutils import Matrix
    transform=Matrix.Translation(Vector(origin)) @ Matrix.Rotation(yaw,4,'Z') @ Matrix.Scale(scale,4)
    for obj in set(active_collection.objects)-before:
        obj.matrix_basis=transform @ obj.matrix_basis

def bench():
    # Reuses the cream drawers + teal ESD surface of the first laboratory.
    box('Bancada · tablero',(0,0,1.39),(5.45,2.2,.16),'cream',.06)
    box('Bancada · ESD',(0,-.025,1.485),(5.16,1.97,.03),'teal',.04)
    for x in [-2.22,2.22]:
        box('Bancada · cajonera',(x,.08,.78),(.75,1.80,1.06),'cream',.04)
        for z in [.48,.80,1.12]:
            box('Bancada · cajón',(x,-.839,z),(.65,.025,.27),'sage',.015)
            box('Bancada · tirador',(x,-.867,z+.055),(.28,.028,.035),'navy',.01)
    box('Bancada · travesaño',(0,.64,.32),(4.4,.11,.10),'metal',.02)

# 02: integrating sphere. Its measurement port is a genuine opening in a shell.
w=start_world('aidimme','02 · AIDIMME','Laboratory Technician','AIDIMME','2015–2020',
              dict(position=[1.12,.12,1.63],scale=.078,rotation=0))
island(); title(w['role'],w['company'],w['years'])
person('David · técnico',(-1.30,-.05,.15))
center=Vector((1.12,.30,1.99)); radius=.99; vs=[]; fs=[]; n=32; rows=15
for k in range(rows+1):
    theta=.57+(math.pi-.57)*k/rows
    for j in range(n):
        a=j*math.tau/n
        vs.append(center+Vector((radius*math.sin(theta)*math.cos(a),-radius*math.cos(theta),radius*math.sin(theta)*math.sin(a))))
for k in range(rows):
    for j in range(n):fs.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
shell=mesh_object('Ulbricht · esfera integradora hueca',vs,fs,'coat')
mod=shell.modifiers.new('Espesor de la esfera','SOLIDIFY'); mod.thickness=.035
ring('Ulbricht · puerto de medida',(1.12,-.535,1.99),.58,.515,.085,'metal')
for x in [.52,1.72]:
    rod('Ulbricht · apoyo',(x,.30,.20),(x,.30,1.2),.075,'metal')
    box('Ulbricht · pie',(x,.30,.23),(.34,.90,.10),'navy',.035)
box('Ulbricht · bisagra',(2.07,.26,1.99),(.12,.22,.42),'metal',.025)
cyl('Ulbricht · sensor superior',(1.12,.30,3.04),.115,.19,'navy')
box('Consola · pedestal',(-.20,.80,.76),(.70,.58,1.20),'sage',.045)
box('Consola · medida',(-.20,.80,1.43),(.83,.62,.25),'navy',.045)
text('Consola · lectura','PHOTOMETRY',(-.54,.47,1.44),.10,'mint',mono=True)

# 03: open roadway luminaire, LED boards and separate control gear.
w=start_world('tecnocrea','03 · IMQ TECNOCREA','Laboratory analyst\nand project coordinator','IMQ TECNOCREA','2020–2023',
              dict(position=[1.0,.18,1.53],scale=.047,rotation=0),camera=[-.30,-10.1,6.15],target=[-.30,0,2.55])
island(); title(w['role'],w['company'],w['years']); bench()
person('David · fotometría',(-2.95,.25,.15),pose='test',yaw=-.25)
box('Vial · base abierta',(.62,.19,1.58),(2.68,.89,.14),'metal',.08)
for y in [-.24,.62]:box('Vial · borde largo',(.62,y,1.77),(2.70,.055,.30),'navy',.02)
box('Vial · testero izquierdo',(-.70,.19,1.77),(.07,.89,.30),'navy',.02)
box('Vial · testero derecho',(1.94,.19,1.77),(.07,.89,.30),'navy',.02)
# Remove the portion of the front lip at the optical tunnel; replace with a frame.
front=bpy.data.objects.get('Vial · borde largo'); bpy.data.objects.remove(front,do_unlink=True)
box('Vial · frontal LED',(-.10,-.24,1.70),(1.49,.055,.15),'navy',.02)
box('Vial · frontal extremo',(1.71,-.24,1.77),(.44,.055,.30),'navy',.02)
box('Vial · dintel del compartimento',(1.0,-.24,1.94),(.78,.06,.05),'metal',.015)
box('Vial · tapa abatida',(.62,.83,2.14),(2.70,.055,.64),'metal',.04,(-.30,0,0))
cyl('Vial · fijación al báculo',(2.18,.20,1.76),.13,.43,'metal',12,(0,math.pi/2,0))
for x in [-.50,-.20,.10,.40,.70,1.,1.3,1.6]:
    box('Vial · aleta de disipación',(x,.87,2.18),(.027,.09,.43),'sage',.008,(-.30,0,0))
for x in [-.44,-.02,.40]:
    box('Vial · placa LED',(x,.17,1.677),(.31,.62,.035),'cream',.01)
    for y in [-.04,.16,.36]:
        box('Vial · LED',(x,y,1.71),(.11,.10,.025),'yellow',.01)
box('Driver · dispositivo de control',(-1.40,-.25,1.61),(.65,.64,.21),'navy',.03)
text('Driver · etiqueta','LED DRIVER',(-1.68,-.586,1.61),.087,'white_text',mono=True)
box('PCB · repuesto',(-.76,-.70,1.545),(.63,.36,.06),'green',.01)
for x in [-.94,-.73,-.52]:box('PCB · LED suelto',(x,-.69,1.591),(.09,.08,.025),'yellow',.005)
cable('Driver · cable rojo',[(-1.08,-.2,1.60),(-.92,-.36,1.54),(-.53,-.44,1.54),(-.43,-.14,1.72)],'red',.014,min_z=1.53)
cable('Driver · cable negro',[(-1.08,-.06,1.59),(-.94,-.12,1.54),(-.60,-.30,1.54),(-.52,.04,1.72)],'rubber',.014,min_z=1.53)
rod('Herramienta · destornillador',(.14,-.71,1.55),(.78,-.77,1.55),.025,'metal')
rod('Herramienta · mango',(.12,-.71,1.55),(.39,-.736,1.55),.058,'orange')

# 04: electrical safety test of an X-ray unit, with a graphic radiograph.
w=start_world('sgs','04 · SGS TECNOS','Laboratory analyst','SGS TECNOS','2023–2024',
              dict(position=[1.20,.21,1.87],scale=.045,rotation=0))
island(); title(w['role'],w['company'],w['years'])
person('David · seguridad eléctrica',(-1.9,.10,.15),pose='test',yaw=-.22)
box('RX · pedestal',(1.25,.79,.38),(1.12,1.2,.43),'cream',.09)
rod('RX · columna',(1.72,.77,.5),(1.72,.77,2.8),.14,'cream',12)
rod('RX · brazo superior',(1.72,.77,2.8),(1.2,.1,2.8),.13,'cream',12)
rod('RX · suspensión',(1.2,.1,2.8),(1.2,.1,2.34),.11,'metal',12)
ring('RX · cabezal abierto',(1.2,-.12,2.12),.39,.285,.49,'cream')
ring('RX · colimador',(1.2,-.40,2.12),.32,.27,.09,'navy')
box('RX · mesa de examen',(.65,-.15,.92),(2.75,1.15,.19),'cream',.08)
box('RX · superficie',(.65,-.15,1.035),(2.58,1.00,.07),'sage',.07)
for x in [-.28,1.58]:box('RX · apoyo de mesa',(x,-.15,.52),(.20,.73,.79),'metal',.035)
box('HiPot · mesa',(-1.04,-.77,1.20),(1.33,.66,.12),'cream',.04)
for x in [-1.51,-.57]:box('HiPot · patas',(x,-.77,.70),(.07,.48,.94),'metal',.01)
box('HiPot · comprobador',(-1.04,-.72,1.42),(1.03,.57,.32),'navy',.04)
box('HiPot · pantalla',(-1.22,-1.014,1.45),(.43,.015,.19),'screen',.01)
text('HiPot · lectura','3.00 kV',(-1.40,-1.026,1.44),.09,'mint',mono=True)
for x,m in [(-.81,'red'),(-.65,'rubber')]:cyl('HiPot · borne',(x,-1.038,1.40),.035,.025,m,12,(math.pi/2,0,0))
cable('Ensayo · cable rojo',[(-.81,-1.07,1.40),(-.31,-1.01,1.43),(.20,-.80,1.64),(.81,-.28,2.18)],'red',.019,min_z=1.30)
cable('Ensayo · cable negro',[(-.65,-1.07,1.40),(-.12,-1.18,1.19),(.78,-.76,1.17),(1.63,-.04,1.14)],'rubber',.018,min_z=1.12)
box('Radiografía · monitor',(-.37,1.08,2.31),(1.25,.14,1.39),'navy',.07)
box('Radiografía · placa',(-.37,.998,2.31),(1.08,.02,1.23),'screen',.02)
rod('Radiografía · soporte',(-.37,1.10,.18),(-.37,1.10,1.67),.065,'metal')
box('Radiografía · pie',(-.37,1.10,.20),(.67,.62,.10),'navy',.025)
# An original stylised chest illustration made of geometry, not a patient image.
for z in [1.88+i*.083 for i in range(11)]:box('RX ilustración · vértebra',(-.37,.98,z),(.047,.012,.052),'xray',.009)
for i in range(7):
    z=2.72-i*.102; width=.20+.15*math.sin(i*math.pi/8)
    for side in [-1,1]:
        cable('RX ilustración · costilla',[(-.37+side*.04,.973,z),(-.37+side*width,.973,z-.025),(-.37+side*(width+.03),.973,z-.09),(-.37+side*.11,.973,z-.12)],'xray',.015)
text('Radiografía · leyenda','X-RAY / TEST',(-.82,.97,1.77),.085,'mint',mono=True)

# 05: project coordination as coloured wooden blocks; the bench is reused.
w=start_world('imq','05 · IMQ IBÉRICA','Laboratory analyst\nand project coordinator','IMQ IBÉRICA','2024–2026',
              dict(position=[.73,.23,1.56],scale=.075,rotation=0),camera=[-.30,-10.1,5.7],target=[-.30,0,2.55])
island(); title(w['role'],w['company'],w['years']); bench()
person('David · coordinación',(-2.98,.27,.15),coat=False,pose='coordinate',yaw=-.2)
colors=['orange','blue','yellow','green','pink']
for level in range(4):
    for x in [.17,1.30]:
        box('Jenga · pilar',(x,.11,1.62+level*.20),(.40,.74,.19),colors[(level+(1 if x>1 else 0))%5],.025)
for x in [.24,.73,1.22]:box('Jenga · dintel',(x,.11,2.43),(.48,.77,.20),'wood',.022)
box('Jenga · bloque en coordinación',(-.50,.13,2.40),(.92,.35,.22),'orange',.03,(0,.18,-.24))
for x,y,material in [(-1.58,-.12,'blue'),(-1.37,-.72,'yellow'),(-.62,-.63,'pink')]:
    for dx,dz in [(0,0),(.23,0),(0,.23)]:
        box('Proyecto · pieza Tetris',(x+dx,y,1.63+dz),(.22,.35,.22),material,.019)
box('Coordinación · lista',(-1.30,.53,1.53),(.78,.75,.025),'cream',.015)
for i in range(4):
    box('Lista · estado',(-1.55,.32+i*.13,1.548),(.06,.06,.005),'green',.001)
    box('Lista · tarea',(-1.25,.32+i*.13,1.548),(.40,.012,.005),'sage',.001)

# 06: Serranos Towers, a maps-style pin and a mug of language flags.
w=start_world('valencia','06 · ABOUT ME','About me','VALÈNCIA','Spain',
              dict(position=[-.60,1.15,.24],scale=.12,rotation=0),camera=[0,-10.8,5.1],target=[0,0,2.5])
island('sand')
text('València · título','VALÈNCIA',(0,-.12,4.32),.59,'teal',bold=True,align='CENTER').data.extrude=.018
text('València · sección','ABOUT ME',(0,-.12,4.91),.22,'orange',bold=True,align='CENTER')
for x in [-1.90,.70]:
    cyl('Serranos · torre octogonal',(x,.55,1.79),.86,3.20,'sand',8,rotation=(0,0,math.pi/8))
    for z in [.38,1.60,2.86,3.37]:cyl('Serranos · cornisa',(x,.55,z),.92,.12,'stone_edge',8,rotation=(0,0,math.pi/8))
    for j in range(8):
        a=math.tau*j/8+math.pi/8
        box('Serranos · almena',(x+.72*math.cos(a),.55+.72*math.sin(a),3.55),(.27,.25,.32),'sand',.01,(0,0,a))
    for z in [1.30,2.32]:
        box('Serranos · saetera',(x,-.259,z),(.07,.015,.32),'stone_edge',.025)
    for z in [.68,.96,1.92,2.60]:
        box('Serranos · hilada frontal',(x,-.257,z),(1.2,.012,.015),'stone_edge',.003)
# A free arch, not a black painted door, houses the wrist-project world.
for x in [-1.20,0]:box('Serranos · jamba',(x,.54,.86),(.29,1.14,1.45),'sand',.015)
for i in range(12):
    a=math.pi*i/12; b=math.pi*(i+1)/12
    vs=[]
    for y in [-.03,1.11]:
        for r,t in [(.51,a),(.73,a),(.73,b),(.51,b)]:vs.append((-.60+r*math.cos(t),y,1.45+r*math.sin(t)))
    mesh_object('Serranos · dovela',vs,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'sand')
box('Serranos · puente alto',(-.60,.55,2.66),(1.42,1.15,1.01),'sand',.01)
box('Serranos · cornisa central',(-.60,.55,3.22),(1.47,1.25,.15),'stone_edge',.01)
for x in [-1.17,-.79,-.41,-.03]:box('Serranos · almena central',(x,.0,3.45),(.24,.30,.32),'sand',.01)
for i in range(5):box('Serranos · peldaño',(-.60,-.28-i*.16,.15+i*.011),(1.19,.16,.065),'stone_edge',.008)
# Location pin: open circular centre and a triangular tail, all true geometry.
ring('Ubicación · aro',(2.28,.08,3.42),.35,.13,.10,'red',24)
mesh_object('Ubicación · punta',[(2.00,.02,3.27),(2.56,.02,3.27),(2.28,.02,2.78),(2,.14,3.27),(2.56,.14,3.27),(2.28,.14,2.78)],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'red')
text('Ubicación · nombre','Valencia',(2.28,-.02,2.57),.19,'teal',bold=True,align='CENTER')
# Open cup with a handle, poles and readable labels.
cup=ring('Languages · taza',(2.07,-.36,.70),.50,.44,.94,'cream',32)
cup.rotation_euler=(math.pi/2,0,0)
# ring has baked coordinates, so rotate its vertices about its own centre instead.
cup.rotation_euler=(0,0,0)
from mathutils import Matrix
cc=Vector((2.07,-.36,.70)); rot=Matrix.Rotation(math.pi/2,3,'X')
for v in cup.data.vertices:v.co=cc+rot@(v.co-cc)
cyl('Languages · fondo',(2.07,-.36,.25),.445,.055,'cream',32)
ring('Languages · asa',(2.59,-.36,.74),.28,.195,.10,'cream',20)
text('Languages · palabra','Languages',(2.07,-.869,.65),.177,'teal',bold=True,align='CENTER')
for i,(label,xx,zz) in enumerate([('Español',1.52,2.07),('Valencià',2.07,2.38),('English',2.63,1.98)]):
    rod('Idioma · mástil '+label,(xx,-.30,.45),(xx,-.30,zz+.05),.022,'wood')
    fx=xx+.24; fz=zz-.17
    box('Bandera · '+label,(fx,-.31,fz),(.48,.021,.31),'yellow' if i<2 else 'cream',.005)
    if i==0:
        for dz in [-.116,.116]:box('España · franja',(fx,-.326,fz+dz),(.48,.008,.078),'red',0)
        box('España · escudo',(fx-.10,-.336,fz),(.055,.008,.082),'orange',.005)
    elif i==1:
        for dz in [-.11,-.037,.037,.11]:box('Senyera · franja',(fx+.047,-.327,fz+dz),(.386,.008,.033),'red',0)
        box('Senyera · franja azul',(fx-.198,-.334,fz),(.083,.008,.31),'blue',0)
        for dz in [-.075,0,.075]:sphere('Senyera · oro',(fx-.199,-.343,fz+dz),.020,'yellow',1)
    else:
        box('Inglés · cruz vertical',(fx,-.329,fz),(.075,.008,.31),'red',0)
        box('Inglés · cruz horizontal',(fx,-.331,fz),(.48,.008,.07),'red',0)
    text('Idioma · '+label,label,(fx,-.35,fz-.25),.101,'teal',bold=True,align='CENTER')

# 07: side-profile bust with bent right arm and a wrist hologram.
w=start_world('projects','07 · PROJECTS','Projects','SELECTED WORK','',
              dict(position=[.12,-.72,2.33],scale=.016,rotation=0),camera=[0,-9.0,4.8],target=[.10,-.15,2.65],hold=4.4)
island()
text('Proyectos · título','PROJECTS',(0,0,4.54),.52,'teal',bold=True,align='CENTER').data.extrude=.018
box('Busto · pedestal',(-1.19,.05,.46),(1.45,1.24,.60),'sage',.14)
box('Busto · torso',(-1.20,.04,1.57),(.94,.65,1.66),'teal',.15)
cyl('Busto · cuello',(-1.16,.04,2.46),.15,.29,'skin',12)
sphere('Busto · cabeza',(-1.13,.02,2.96),(.35,.31,.46),'skin')
sphere('Busto · pelo',(-1.23,.07,3.19),(.34,.33,.31),'hair')
sphere('Busto · nariz',(-.778,-.015,2.96),(.12,.082,.10),'skin',1)
sphere('Busto · oreja',(-1.20,-.284,2.97),(.09,.04,.125),'skin',1)
sphere('Busto · ojo',(-.878,-.182,3.075),.026,'navy',1)
rod('Brazo derecho · bíceps',(-.94,-.32,2.13),(.45,-.30,2.10),.155,'teal',10)
rod('Brazo derecho · antebrazo',(.45,-.30,2.10),(.12,-.83,2.11),.13,'skin',10)
sphere('Brazo derecho · mano',(-.005,-1.025,2.13),(.16,.20,.11),'skin')
rod('Brazo izquierdo · manga',(-1.50,.12,2.13),(-1.57,.18,1.35),.15,'teal')
box('Reloj · correa',(.12,-.83,2.11),(.28,.23,.28),'navy',.04)
box('Reloj · proyector',(.12,-.83,2.285),(.32,.30,.08),'metal',.035)
ring('Reloj · lente portal',(.12,-.971,2.385),.12,.095,.055,'holo',20)
for x in [-.01,.25]:box('Reloj · cámara hueca',(x,-.83,2.385),(.036,.27,.19),'navy',.013)
box('Reloj · emisor',(.12,-.83,2.34),(.20,.20,.025),'holo',.025)
beam_mat=mat('Holograma · haz translúcido','#5be5ed',emission=.30)
bp=beam_mat.node_tree.nodes['Principled BSDF'];bp.inputs['Alpha'].default_value=.085
beam_mat.surface_render_method='DITHERED'; M['beam']=beam_mat
corners=[(.38,-.37,2.52),(2.18,-.37,2.52),(2.18,-.37,4.32),(.38,-.37,4.32)]
mesh_object('Holograma · cono piramidal',[(.12,-.83,2.35)]+corners,[(0,1,2),(0,2,3),(0,3,4),(0,4,1)],'beam')
for j in range(4):
    rod('Holograma · arista',(.12,-.83,2.35),corners[j],.008,'holo',6)
    rod('Holograma · marco',corners[j],corners[(j+1)%4],.019,'holo',8)

def picture(name,path,center,width,height):
    image=bpy.data.images.load(str(ROOT/'assets'/path),check_existing=True)
    material=bpy.data.materials.new(name+' · imagen');material.use_nodes=True
    p=material.node_tree.nodes.get('Principled BSDF')
    p.inputs['Roughness'].default_value=.85
    p.inputs['Emission Strength'].default_value=.65
    tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    material.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    material.node_tree.links.new(tex.outputs['Color'],p.inputs['Emission Color'])
    x,y,z=center
    obj=mesh_object(name,[(x-width/2,y,z-height/2),(x+width/2,y,z-height/2),(x+width/2,y,z+height/2),(x-width/2,y,z+height/2)],[(0,1,2,3)],material)
    uv=obj.data.uv_layers.new(name='UVMap')
    for loop,co in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=co
    return obj

project_objects=[]
for idx,(name,asset,url) in enumerate([
    ('APPASEO','APPASEO_template.webp','/projects/appaseo/'),
    ('MEMORY ROYALE','MemoryRoyale.webp','/projects/memoryroyale/'),
    ('PÁGINA WEB HUELLA','HuellaTemplate.webp','https://adminclinicahuella.github.io/ClinicaHuella/'),
    ('PROGRAMA LUMENLAB','lumenlab.png','/projects/lumenlab/')]):
    cover=picture('PROJECT_COVER_'+str(idx),asset,(1.28,-.383,3.61),1.69,1.02)
    label=fit(text('PROJECT_LABEL_'+str(idx),name,(1.28,-.389,2.89),.17,'holo',bold=True,align='CENTER'),1.62)
    count=text('PROJECT_COUNT_'+str(idx),('%02d / 04'%(idx+1)),(1.28,-.389,2.66),.105,'holo',mono=True,align='CENTER')
    count['project_index']=idx
    cover['project_index']=idx;label['project_index']=idx
    cover['project_url']=url
    project_objects.extend([cover,label,count])

# 08: the plane's real open window contains another instance of the desk.
w=start_world('ready','08 · NEXT CHAPTER','I’m ready, and you?','LET’S BUILD WHAT’S NEXT','',
              dict(position=[.0,.0,2.02],scale=.045,rotation=-math.pi/2),camera=[-3.6,-9.2,5.2],target=[0,0,2.7])
text('Final · invitación','I’m ready, and you?',(0,-.1,4.35),.53,'teal',bold=True,align='CENTER').data.extrude=.016
text('Final · apoyo','LET’S BUILD WHAT’S NEXT',(0,-.1,3.88),.20,'orange',bold=True,align='CENTER')
plane_objects=set(active_collection.objects)
xs=[-2.4,-2.10,-1.65,-.80,-.20,.20,.80,1.5,2.04,2.20]
rs=[.035,.27,.46,.48,.48,.48,.48,.40,.22,.04]
angles=[-math.pi+i*math.tau/24 for i in range(25)]
vs=[];fs=[]
for x,r in zip(xs,rs):
    for a in angles:vs.append((x,-r*math.cos(a),2.10+r*math.sin(a)))
for i in range(len(xs)-1):
    for j in range(len(angles)-1):
        if i==4 and abs((angles[j]+angles[j+1])/2)<.52:continue
        a=i*25+j;fs.append((a,a+1,a+26,a+25))
mesh_object('Avión · fuselaje con ventanilla hueca',vs,fs,'cream')
for x in [-1.20,-.60,.60,1.11]:
    box('Avión · ventanilla',(x,-.450,2.20),(.23,.025,.23),'screen',.075)
for x in [-.226,.226]:box('Avión · marco ventana portal',(x,-.447,2.10),(.045,.055,.44),'metal',.015)
for z in [1.89,2.31]:box('Avión · marco ventana portal',(0,-.447,z),(.45,.055,.05),'metal',.015)
mesh_object('Avión · ala', [(-.80,0,1.99),(.95,0,1.99),(1.29,2.25,1.96),(.72,2.4,1.98),(-.80,0,1.93),(.95,0,1.93),(1.29,2.25,1.90),(.72,2.4,1.92)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'teal')
mesh_object('Avión · ala cercana',[(-.80,0,1.99),(.95,0,1.99),(1.29,-2.25,1.96),(.72,-2.4,1.98),(-.80,0,1.93),(.95,0,1.93),(1.29,-2.25,1.90),(.72,-2.4,1.92)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'teal')
mesh_object('Avión · deriva',[(1.1,0,2.39),(2.06,0,2.35),(1.9,0,3.36),(1.55,0,3.36),(1.1,.07,2.39),(2.06,.07,2.35),(1.9,.07,3.36),(1.55,.07,3.36)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'orange')
for y in [-1.04,1.04]:
    engine=ring('Avión · turbina',(.45,y,1.67),.21,.145,.64,'navy',20)
    cc=Vector((.45,y,1.67)); rr=Matrix.Rotation(math.pi/2,3,'Z')
    for v in engine.data.vertices:v.co=cc+rr@(v.co-cc)
rotation=Matrix.Rotation(-math.pi/2,4,'Z')
for obj in set(active_collection.objects)-plane_objects:obj.matrix_basis=rotation@obj.matrix_basis
for x,y,z,s in [(-2.7,.4,1.0,.45),(2.6,.8,1.7,.54),(-1.4,1.5,.45,.34),(1.2,-1.4,.50,.40)]:
    for dx,dz in [(-.28,0),(0,.14),(.29,0)]:sphere('Nube · faceta',(x+dx,y,z+dz),(s,.32,s*.57),'coat',1)

# Export, nested transforms and the two responsive camera tracks follow below.
def portal_matrix(w):
    p=w['portal']
    return Matrix.Translation(Vector(p['position'])) @ Matrix.Rotation(p['rotation'],4,'Z') @ Matrix.Scale(p['scale'],4)

def cubic(a,b,c,d,t):
    return a*(1-t)**3+b*(3*(1-t)**2*t)+c*(3*(1-t)*t*t)+d*t**3

def smooth(t):return t*t*(3-2*t)

def pose(i,t,mobile=False):
    w=worlds[i]; nxt=worlds[(i+1)%8]; m=portal_matrix(w)
    a=Vector(w['mobile_camera'] if mobile else w['camera'])
    at=Vector(w['target'])
    d=m@Vector(nxt['mobile_camera'] if mobile else nxt['camera'])
    dt=m@Vector(nxt['target'])
    # Logarithmic distance closes most of the scale gap gradually. Smoothstep
    # gives zero velocity at reading stops, avoiding direction changes on entry.
    s=smooth(t); u=(1-math.exp(-5.2*s))/(1-math.exp(-5.2))
    b=a.lerp(d,.36)
    c=d+(m.to_3x3()@Vector((0,-4,0)))
    if i==0:
        b=Vector((1.30,-2.2,2.86)); c=Vector((1.02,-.575,2.405))
    elif i==7:
        b=Vector((-1.9,-.20,2.34));c=d+Vector((-.55,0,0))
    p=cubic(a,b,c,d,u)
    target=at.lerp(dt,smooth(min(1,u/.84)))
    return p,target

for i,w in enumerate(worlds):
    w['mobile_camera']=list(w['camera'])
    if i==0:w['mobile_camera']=[-.35,-4.30,4.15]
    w['duration']=w['hold']+1.65
    w['start']=sum(a['duration'] for a in worlds[:i])
total=sum(w['duration'] for w in worlds)
scene.name='00 · RECORRIDO ANIDADO'
scene.world.node_tree.nodes['Background'].inputs[0].default_value=rgba('#dfe7dc')
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
scene['description']='Eight physically nested worlds; camera scale is rebased with the surrounding geometry to retain numerical precision. No black transitions.'
scene['revision']='v03 · 8 mundos, matriosca, escritorio corregido, móvil y bucle'
if 'portal_frames' in scene:del scene['portal_frames']
scene.render.resolution_x=1600;scene.render.resolution_y=1000
scene.render.fps=30
scene.frame_end=round(total*75)+1

def export_world(w):
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    deps=bpy.context.evaluated_depsgraph_get();copies=[]
    for obj in list(w['collection'].objects):
        if obj.type not in {'MESH','FONT','CURVE'}:continue
        mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
        copy=bpy.data.objects.new(obj.name,mesh);scene.collection.objects.link(copy)
        copy.matrix_world=obj.matrix_world.copy()
        for key in obj.keys():copy[key]=obj[key]
        copy.select_set(True);copies.append(copy)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(w['id']+'.glb')),export_format='GLB',use_selection=True,
                             export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
    for obj in copies:
        mesh=obj.data;bpy.data.objects.remove(obj,do_unlink=True)
        if mesh.users==0:bpy.data.meshes.remove(mesh)
    print('EXPORTED',w['id'],flush=True)

for w in worlds:export_world(w)

metadata=[]
for i,w in enumerate(worlds):
    item={key:w[key] for key in ['id','name','camera','mobile_camera','target','portal','role','company','years','hold','duration','start']}
    item['file']=w['id']+'.glb'
    item['path']={}
    for mode in ['desktop','mobile']:
        item['path'][mode]=[{'position':list(p),'target':list(at)} for p,at in [pose(i,j/180,mode=='mobile') for j in range(181)]]
    metadata.append(item)
(OUT/'worlds.json').write_text(json.dumps({'version':3,'coordinates':'Z-up; wrap each glTF scene in rotation X=PI/2',
    'total':total,'horizontal_fov':2*math.atan(36/(2*45)), 'worlds':metadata,
    'projects':[
      {'name':'APPASEO','url':'/projects/appaseo/','image':'/assets/APPASEO_template.webp'},
      {'name':'MEMORY ROYALE','url':'/projects/memoryroyale/','image':'/assets/MemoryRoyale.webp'},
      {'name':'PÁGINA WEB HUELLA','url':'https://adminclinicahuella.github.io/ClinicaHuella/','image':'/assets/HuellaTemplate.webp'},
      {'name':'PROGRAMA LUMENLAB','url':'/projects/lumenlab/','image':'/assets/lumenlab.png'}]},ensure_ascii=False,indent=2),encoding='utf-8')

# Source collections are available in each authoring scene, without offsetting
# separate islands beside each other. The master uses nested collection instances.
for w in worlds:scene.collection.children.unlink(w['collection'])
def instance(target_scene,w,name,matrix):
    obj=bpy.data.objects.new(name,None)
    obj.instance_type='COLLECTION';obj.instance_collection=w['collection']
    target_scene.collection.objects.link(obj);obj.matrix_world=matrix
    return obj

def studio(target_scene):
    for name,rotation,energy,color in [
        ('Sol · principal',(.92,-.20,-.48),2.8,(1.0,.94,.84)),
        ('Sol · relleno',(1.04,.28,1.60),1.5,(.80,.91,1.0)),
        ('Sol · ambiente',(-.20,.12,1.0),.6,(.85,1.0,.92))]:
        data=bpy.data.lights.new(name,'SUN');data.energy=energy;data.angle=.22;data.color=color
        data.use_shadow=False
        obj=bpy.data.objects.new(name,data);target_scene.collection.objects.link(obj);obj.rotation_euler=rotation
    target_scene.world=scene.world
    target_scene.render.engine='BLENDER_EEVEE';target_scene.view_settings.view_transform='AgX'
    target_scene.render.resolution_x=1600;target_scene.render.resolution_y=1000
    target_scene.render.image_settings.file_format='PNG'

def new_camera(target_scene,name):
    data=bpy.data.cameras.new(name);data.lens=45;data.sensor_width=36;data.sensor_fit='HORIZONTAL'
    data.clip_start=.00001;data.clip_end=1500
    obj=bpy.data.objects.new(name,data);target_scene.collection.objects.link(obj)
    obj.rotation_mode='QUATERNION';data.passepartout_alpha=1
    target_scene.camera=obj
    return obj

studio(scene);cam=new_camera(scene,'CAM · recorrido continuo')
instances=[instance(scene,w,w['name']+' · instancia',Matrix.Identity(4)) for w in worlds]
track_lights=[obj for obj in scene.objects if obj.type=='LIGHT']
light_rotations=[obj.rotation_euler.copy() for obj in track_lights]
scene.timeline_markers.clear()
previous_q=None
for f in range(1,scene.frame_end+1):
    time=min(total,(f-1)/75)
    if time>=total:i=0;local=0
    else:
        i=max(j for j,w in enumerate(worlds) if time>=w['start'])
        local=time-worlds[i]['start']
    w=worlds[i];t=max(0,min(1,(local-w['hold'])/1.65))
    p,target=pose(i,t)
    cam.location=p;q=(target-p).to_track_quat('-Z','Y')
    if previous_q:q.make_compatible(previous_q)
    previous_q=q.copy();cam.rotation_quaternion=q
    cam.keyframe_insert('location',frame=f);cam.keyframe_insert('rotation_quaternion',frame=f)
    transforms={i:Matrix.Identity(4),(i-1)%8:portal_matrix(worlds[(i-1)%8]).inverted()}
    transforms[(i+1)%8]=portal_matrix(w)
    transforms[(i+2)%8]=portal_matrix(w)@portal_matrix(worlds[(i+1)%8])
    for j,obj in enumerate(instances):
        obj.hide_render=j not in transforms;obj.hide_viewport=j not in transforms
        if j in transforms:obj.matrix_world=transforms[j]
        for prop in ['location','rotation_euler','scale','hide_render','hide_viewport']:obj.keyframe_insert(prop,frame=f)
    angle=-sum(k['portal']['rotation'] for k in worlds[:i])
    for obj,rot in zip(track_lights,light_rotations):
        obj.rotation_euler=rot;obj.rotation_euler.z+=angle;obj.keyframe_insert('rotation_euler',frame=f)
    project_index=min(3,max(0,int(local/1.1))) if i==6 else 0
    for obj in project_objects:
        obj.hide_render=obj['project_index']!=project_index
        obj.keyframe_insert('hide_render',frame=f)
        obj.hide_viewport=obj.hide_render;obj.keyframe_insert('hide_viewport',frame=f)

for w in worlds:scene.timeline_markers.new(w['name'],frame=round(w['start']*75)+1)
for j,name in enumerate(['APPASEO','MEMORY ROYALE','HUELLA','LUMENLAB']):
    scene.timeline_markers.new(name,frame=round((worlds[6]['start']+j*1.1)*75)+1)
scene.timeline_markers.new('Ventanilla → escritorio · bucle',frame=scene.frame_end)
# Rebase is a change of coordinate frame, so interpolate these baked poses
# constantly. At 30 fps the sampled camera itself still advances smoothly.
for action in bpy.data.actions:
    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                bag=strip.channelbag(slot,ensure=False)
                if bag:
                    for fc in bag.fcurves:
                        for k in fc.keyframe_points:k.interpolation='CONSTANT'

authoring=[]
for i,w in enumerate(worlds):
    sc=bpy.data.scenes.new(w['name']);studio(sc)
    sc.collection.children.link(w['collection'])
    m=portal_matrix(w)
    instance(sc,worlds[(i+1)%8],'INTERIOR · '+worlds[(i+1)%8]['id'],m)
    instance(sc,worlds[(i+2)%8],'INTERIOR · segundo nivel',m@portal_matrix(worlds[(i+1)%8]))
    cc=new_camera(sc,'CAM · '+w['id']);cc.location=w['camera'];cc.rotation_quaternion=(Vector(w['target'])-cc.location).to_track_quat('-Z','Y')
    sc['portal_description']='The following world is a scaled collection instance inside this world’s open object.'
    sc['next_world']=worlds[(i+1)%8]['id']
    authoring.append(sc)

scene.frame_set(1)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.region_3d.view_perspective='CAMERA';space.region_3d.view_camera_zoom=4
            space.overlay.show_overlays=False;space.shading.type='MATERIAL'
            space.shading.use_scene_lights=True;space.shading.use_scene_world=True
            space.clip_start=.00001;space.clip_end=1500
bpy.context.window.scene=scene
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'portfolio-nested.blend'))
print('SAVED: portfolio-nested.blend',flush=True)

if '--render' in sys.argv:
    for i,sc in enumerate(authoring):
        bpy.context.window.scene=sc
        sc.frame_set(round(worlds[i]['start']*75)+1)
        sc.render.resolution_percentage=75
        sc.render.filepath=str(PREVIEWS/('v03-%02d-%s.png'%(i+1,worlds[i]['id'])))
        bpy.ops.render.render(write_still=True)
        sc.render.resolution_x=780;sc.render.resolution_y=1440;sc.render.resolution_percentage=75
        sc.camera.location=worlds[i]['mobile_camera']
        sc.camera.rotation_quaternion=(Vector(worlds[i]['target'])-sc.camera.location).to_track_quat('-Z','Y')
        sc.render.filepath=str(PREVIEWS/('v03-%02d-mobile.png'%(i+1)))
        bpy.ops.render.render(write_still=True)
        print('RENDERED',sc.name,flush=True)
    bpy.context.window.scene=scene
print('DONE: 8 worlds, nested Blender animation, responsive camera paths, 8 GLBs.',flush=True)
