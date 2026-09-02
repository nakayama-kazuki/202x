@python -c "import sys; sys.argv[0]=r'%~nx0'; exec(''.join(open(r'%~f0', encoding='utf-8').readlines()[1:]))" %* || pause & goto:eof

import sys
import importlib

dependencies = {
    'cv2' : {
        'pkg' : 'opencv-python'
    }
}

INTERVAL = 1000

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
    cv2.imshow('Camera', frame)
    if cv2.waitKey(INTERVAL) >= 0:
        break

camera.release()
cv2.destroyAllWindows()
