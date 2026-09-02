@python -c "import sys; sys.argv[0]=r'%~nx0'; exec(''.join(open(r'%~f0', encoding='utf-8').readlines()[1:]))" %* || pause & goto:eof

import sys
import importlib

dependencies = {
    'cv2' : {
        'pkg' : 'opencv-python'
    }
}

def setupArgs(in_specDict, in_prefix='--'):
    if f'{in_prefix}help' in sys.argv:
        for name, spec in in_specDict.items():
            print(f'{in_prefix}{name} : {spec["explain"]} ( default = {spec["default"]} )')
        sys.exit(0)
    parmDict = {}
    if any(arg.startswith(in_prefix) for arg in sys.argv):
        import argparse
        parser = argparse.ArgumentParser(add_help=False)
        nameSet = set()
        for arg in sys.argv[1:]:
            if arg.startswith(in_prefix):
                name = arg[len(in_prefix):].split('=')[0]
                if name not in nameSet:
                    parser.add_argument(f'{in_prefix}{name}')
                    nameSet.add(name)
        parmDict = vars(parser.parse_args())
    for name, spec in in_specDict.items():
        if parmDict.get(name) is None:
            parmDict[name] = spec['default']
        if 'convert' in spec:
            parmDict[name] = spec['convert'](parmDict[name])
    return parmDict

ARGS = setupArgs({
    'interval' : {
        'default' : '1000',
        'convert' : lambda in_ms: int(in_ms),
        'explain' : 'Snapshot interval in milliseconds.'
    },
    'mirror' : {
        'default' : 'True',
        'convert' : lambda in_bool: in_bool.lower() == 'true',
        'explain' : 'Mirror the camera image horizontally.'
    }
})

for dependency, info in dependencies.items():
    try:
        if 'src' in info:
            module = importlib.import_module(info['src'])
            globals()[dependency] = getattr(module, dependency)
        else:
            globals()[dependency] = importlib.import_module(dependency)
    except ImportError:
        packageName = info.get('pkg', dependency)
        print(f'ERROR : exec "$ python -m pip install {packageName}" at first.')
        sys.exit(1)

camera = cv2.VideoCapture(0)

while True:
    ret, frame = camera.read()
    if not ret:
        break
    if ARGS['mirror']:
        frame = cv2.flip(frame, 1)
    cv2.imshow('Camera', frame)
    if cv2.waitKey(ARGS['interval']) >= 0:
        break

camera.release()
cv2.destroyAllWindows()
