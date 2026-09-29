"""Run this file in Blender's Text Editor to enable the ON3P Geometry sidebar.
No auto-execution is needed. Node.js must be on PATH. Assets stay local.
"""
import bpy, json, subprocess, shutil, importlib.util
from pathlib import Path
from bpy.props import EnumProperty, FloatProperty, BoolProperty
ROOT=Path(__file__).resolve().parents[1]
MODULE=importlib.util.spec_from_file_location('on3p_adapter',ROOT/'scripts/blender_build.py')
adapter=importlib.util.module_from_spec(MODULE);MODULE.loader.exec_module(adapter)
CONSTRUCTION=importlib.util.spec_from_file_location('on3p_construction',ROOT/'scripts/blender_construction.py')
construction=importlib.util.module_from_spec(CONSTRUCTION);CONSTRUCTION.loader.exec_module(construction)
DATA=json.loads((ROOT/'data/on3p.json').read_text())
def sizes(self,context):
    model=next(m for m in DATA['models'] if m['handle']==context.scene.on3p_model)
    return [(str(s['length_cm']),str(s['length_cm'])+' cm','Published size') for s in model['lengths']]
class ON3P_OT_Generate(bpy.types.Operator):
    bl_idname='on3p.generate';bl_label='Regenerate ski pair';bl_options={'REGISTER','UNDO'}
    def execute(self,context):
        s=context.scene;node=shutil.which('node')
        if not node:self.report({'ERROR'},'Node.js is required on PATH');return {'CANCELLED'}
        overrides={k:getattr(s,'on3p_'+k) for k in ['tipMm','waistMm','tailMm','tipRiseMm','tailRiseMm','camberMm','thicknessMm']} if s.on3p_custom else {}
        payloads=[]
        try:
            if s.on3p_inside:
                layered=construction.payload(s.on3p_model,int(s.on3p_length),s.on3p_layup,overrides)
            for side in [0,1]:
                request={'handle':s.on3p_model,'length':int(s.on3p_length),'side':side,'overrides':overrides}
                run=subprocess.run([node,str(ROOT/'scripts/resolve-one.mjs')],input=json.dumps(request),capture_output=True,text=True,check=True,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                payloads.append(json.loads(run.stdout))
        except Exception as e:self.report({'ERROR'},str(e));return {'CANCELLED'}
        coll=bpy.data.collections.get('ON3P Parametric Preview')
        if not coll:coll=bpy.data.collections.new('ON3P Parametric Preview');s.collection.children.link(coll)
        for obj in list(coll.objects):
            if obj.get('on3p_generated_preview'):bpy.data.objects.remove(obj,do_unlink=True)
        if s.on3p_inside:
            root,objects=construction.add_study(layered,coll,s.on3p_model,exploded=s.on3p_separation)
            bpy.ops.object.select_all(action='DESELECT');root.select_set(True);context.view_layer.objects.active=root
        else:
            mats=adapter.materials(s.on3p_model)
            for i,p in enumerate(payloads):
                obj=adapter.import_mesh(p,'ON3P Preview '+('L' if i==0 else 'R'),coll,mats);obj.location.x=(.5-i)*.22;obj['on3p_generated_preview']=True
        return {'FINISHED'}
class ON3P_PT_Geometry(bpy.types.Panel):
    bl_label='ON3P Geometry';bl_idname='ON3P_PT_geometry';bl_space_type='VIEW_3D';bl_region_type='UI';bl_category='ON3P'
    def draw(self,context):
        s=context.scene;l=self.layout;l.prop(s,'on3p_model');l.prop(s,'on3p_length');l.prop(s,'on3p_inside')
        if s.on3p_inside:
            l.prop(s,'on3p_layup');l.prop(s,'on3p_separation');l.label(text='Internal dimensions are illustrative.',icon='INFO')
        l.prop(s,'on3p_custom')
        if s.on3p_custom:
            for k in ['tipMm','waistMm','tailMm','tipRiseMm','tailRiseMm','camberMm','thicknessMm']:l.prop(s,'on3p_'+k)
        l.operator('on3p.generate');l.label(text='Rocker and thickness are estimates.',icon='INFO')
for cls in [ON3P_OT_Generate,ON3P_PT_Geometry]:
    old=getattr(bpy.types,cls.__name__,None)
    if old:bpy.utils.unregister_class(old)
    bpy.utils.register_class(cls)
bpy.types.Scene.on3p_model=EnumProperty(name='Model',items=[(m['handle'],m['name'],'') for m in DATA['models']],default='jeffrey-106')
bpy.types.Scene.on3p_length=EnumProperty(name='Length',items=sizes)
bpy.context.scene.on3p_length='186'
bpy.types.Scene.on3p_custom=BoolProperty(name='Hypothetical dimension overrides',default=False)
bpy.types.Scene.on3p_inside=BoolProperty(name='Show construction layers',default=False)
bpy.types.Scene.on3p_layup=EnumProperty(name='Layup',items=[(name,name,'') for name in construction.LAYUPS],default='Stock')
def update_separation(self,context):
    coll=bpy.data.collections.get('ON3P Parametric Preview')
    if coll:
        for obj in coll.objects:
            if 'separation' in obj:
                obj['separation']=self.on3p_separation
                obj.update_tag(refresh={'OBJECT'})
bpy.types.Scene.on3p_separation=FloatProperty(name='Layer separation',default=1,min=0,max=1,update=update_separation)
for k,name,default in [('tipMm','Tip width (mm)',134),('waistMm','Waist width (mm)',106),('tailMm','Tail width (mm)',127),('tipRiseMm','Tip rise (mm)',73.07),('tailRiseMm','Tail rise (mm)',53.03),('camberMm','Camber (mm)',2.19),('thicknessMm','Underfoot (mm)',13.14)]:
    setattr(bpy.types.Scene,'on3p_'+k,FloatProperty(name=name,default=default,min=0,max=200))
print('ON3P Geometry panel ready in Viewport > Sidebar > ON3P')
