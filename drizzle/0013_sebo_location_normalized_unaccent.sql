UPDATE sebos
SET
  cityNormalized = lower(trim(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(
                            replace(
                              replace(
                                replace(
                                  replace(
                                    replace(
                                      replace(
                                        replace(
                                          replace(
                                            replace(
                                              replace(
                                                replace(
                                                  replace(
                                                    replace(
                                                      replace(
                                                        replace(
                                                          replace(
                                                            replace(
                                                              replace(
                                                                replace(
                                                                  replace(
                                                                    replace(
                                                                      replace(
                                                                        replace(city, 'Á', 'A'),
                                                                      'À', 'A'),
                                                                    'Â', 'A'),
                                                                  'Ã', 'A'),
                                                                'Ä', 'A'),
                                                              'á', 'a'),
                                                            'à', 'a'),
                                                          'â', 'a'),
                                                        'ã', 'a'),
                                                      'ä', 'a'),
                                                    'É', 'E'),
                                                  'È', 'E'),
                                                'Ê', 'E'),
                                              'Ë', 'E'),
                                            'é', 'e'),
                                          'è', 'e'),
                                        'ê', 'e'),
                                      'ë', 'e'),
                                    'Í', 'I'),
                                  'Ì', 'I'),
                                'Î', 'I'),
                              'Ï', 'I'),
                            'í', 'i'),
                          'ì', 'i'),
                        'î', 'i'),
                      'ï', 'i'),
                    'Ó', 'O'),
                  'Ò', 'O'),
                'Ô', 'O'),
              'Õ', 'O'),
            'Ö', 'O'),
          'ó', 'o'),
        'ò', 'o'),
      'ô', 'o'),
    'õ', 'o'),
  'ö', 'o'))
  )),
  stateNormalized = upper(trim(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(
                            replace(
                              replace(
                                replace(
                                  replace(
                                    replace(
                                      replace(
                                        replace(
                                          replace(
                                            replace(
                                              replace(
                                                replace(
                                                  replace(
                                                    replace(
                                                      replace(
                                                        replace(
                                                          replace(
                                                            replace(
                                                              replace(
                                                                replace(
                                                                  replace(
                                                                    replace(
                                                                      replace(
                                                                        replace(state, 'Á', 'A'),
                                                                      'À', 'A'),
                                                                    'Â', 'A'),
                                                                  'Ã', 'A'),
                                                                'Ä', 'A'),
                                                              'á', 'a'),
                                                            'à', 'a'),
                                                          'â', 'a'),
                                                        'ã', 'a'),
                                                      'ä', 'a'),
                                                    'É', 'E'),
                                                  'È', 'E'),
                                                'Ê', 'E'),
                                              'Ë', 'E'),
                                            'é', 'e'),
                                          'è', 'e'),
                                        'ê', 'e'),
                                      'ë', 'e'),
                                    'Í', 'I'),
                                  'Ì', 'I'),
                                'Î', 'I'),
                              'Ï', 'I'),
                            'í', 'i'),
                          'ì', 'i'),
                        'î', 'i'),
                      'ï', 'i'),
                    'Ó', 'O'),
                  'Ò', 'O'),
                'Ô', 'O'),
              'Õ', 'O'),
            'Ö', 'O'),
          'ó', 'o'),
        'ò', 'o'),
      'ô', 'o'),
    'õ', 'o'),
  'ö', 'o'))
  ))
WHERE city IS NOT NULL OR state IS NOT NULL;
