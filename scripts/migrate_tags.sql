DO
$$
DECLARE
    tags JSONB := '[
        {"id": "K300892", "hk": "ngH71F913cawZESRhi8KhaI4W9lXAys+hk+3txMqRA8=", "pk": "eej3g1NScqaECB5sJv4ZqOJzMQIkMWQMi9y3BA=="},
        {"id": "K301016", "hk": "35tiszVxtl/GQGUzI4azelT87lFjQlZ8jVQHh2RPnws=", "pk": "8JsJvctWbLeWzt2oODehbZfYp2RHJ15GlOOzgw=="},
        {"id": "K300994", "hk": "UVjXSOwjHwa5xlJXsz4E7HaVfC7rg36NbX24qoxiER0=", "pk": "o8c5CXevuM2lkfa5C5IbkmZ++x2gYMEfMObaNw=="},
        {"id": "K300873", "hk": "6GmYR+rrNUnPMsAjWdIy21EI9Q1pvNXc7hdVCsW2NVY=", "pk": "bzvrAPCuTFCUjOqelyVMkmQNB6umv/0HhRrJ3A=="},
        {"id": "K301311", "hk": "auOpxk9I6lyW1/ca0szkSdmkPQ7yH/WnnrjNmjy9X8Y=", "pk": "vJpbrL4D3kB9efSBV6qmqy5ppHzbAqEdqJtYhw=="},
        {"id": "K300899", "hk": "tKZjh+y1uiT7vvrcHgnGLLhLzI2exgPE0ZXt8qoK92w=", "pk": "gZ3I/rlR4AonWyONGQaugvgecf3CUbzMoJ7wvg=="},
        {"id": "K300887", "hk": "gvMlqFA25kFw0ksn9PkQEYRyiTx7shwPHmGTD4zt8Gg=", "pk": "us1WgF7xpWP/oQqTGe8qXQOlFRvaXL31WNcnIw=="},
        {"id": "K300881", "hk": "v1N3m7hf6mLRwEs79TC7RgV9okW3MNS/83JBKfHsqDA=", "pk": "0jmO6sFewv7JErvV+C4CubYSHrb4jXRQioNQNQ=="},
        {"id": "K300853", "hk": "0nUZHyerV0svvklLXX6B0SxwH62NFIl0YvRBDiGnEE0=", "pk": "sDgC/pOcbOCaRJ4UNAublDNADo6wXuktR1jiyw=="},
        {"id": "K300837", "hk": "teNqqAEnNzf4PfVjShazvt1NJOEgzA/ThbdA3Zu/uis=", "pk": "dRkX3kFyQ4J9l+phsGpVSJ8PwkNq+82l3DDzVw=="},
        {"id": "K301293", "hk": "ivWM4lg5pIfa4NoslIvtlCTiVBNiXtAi2OutgDkYgy8=", "pk": "7iIQL8bbG3bes76xDb/z44wlMwG6APg4GVRIvA=="},
        {"id": "K301576", "hk": "bZsoQfNER2oKpD8wOwb/HkOowpITF1sqbdLjP0SKPpk=", "pk": "Gb5xc18PT2ofGZSDJUHqOf4iy9Q5Zxo+VpSytA=="},
        {"id": "K301512", "hk": "YuK1Ig5GUQNkd7lnTBxwbBlV+xD+f/v7pRU0xyJkeZo=", "pk": "N7eRBdOi3i4lGsjtVv4sn05P5AUDKL6nV0ZIRw=="},
        {"id": "K301385", "hk": "7V2IxxFq5tkzEsmF7S4M4wJUxzTCDgZEHeUGu33OvBM=", "pk": "fzcXTZLBPo2qZOJUfYF/4T4NFPD7hpoKpqnRyA=="},
        {"id": "K301254", "hk": "yHEX6TUNM2txFc6h4kjW4KuRX3zXwWPn2XFMm2zI/10=", "pk": "pdQjkEjU9Dvy03nXm9MCDZ7j00RDa46SxLY6ng=="},
        {"id": "K301346", "hk": "KvJfIrxaigMh+gopEFxZ0QWEjS/85+6+JPn9YNm6pPU=", "pk": "fIu5fyeOZlOj6XuZbj1Jdh2O6bYdkMUCP1gLhw=="},
        {"id": "K301306", "hk": "bEtajOJejQGwtGmBwPJH//0rdizvDIbA602j85hhddY=", "pk": "WzYDu80Hh8mPelhqGLTxtWEX5Dap54B5SJX0Zg=="},
        {"id": "K301342", "hk": "J+g8xxh7F3Wj1HrgzC6Vk+n9GSAXPAhbzopKxLx73HQ=", "pk": "TFja0zMlsWfTgyHyT97EcQwr46HEVVZunNvSvQ=="},
        {"id": "K301338", "hk": "yTmucaxKfVdJre8oJMIhHHiqQSKzCX6A9ehEGa7mkq8=", "pk": "qWv5wliDXacskd01V1Ma0GeOYhYnO3nx0zCavw=="},
        {"id": "K300906", "hk": "ng0nBjtGgxEEzwXPaNiguLSuYCxAdGOeJFifUZFCLLQ=", "pk": "WR+sqpJc0duNA39SW3CGICvWFxk+assPS6XeuA=="},
        {"id": "K300973", "hk": "xKuEbCp5tm/oUWZeNmUi2YP3MYkRe1sfpmU5WNP2vK0=", "pk": "nI8LDBXH1kTpP7vfDbiMKvDBSUo3mnrl0KfbCw=="},
        {"id": "K300983", "hk": "PLm98O0ON0SjcghjS7pw7qyYO4sB0/K+JEaavkht0kg=", "pk": "Be70TkLlkJKc6vDmd/NFvYDHFq4y9rmo8RtU+g=="},
        {"id": "K300901", "hk": "aVXWDpaB1h94AsjV+J5eppAyZEJ3U2th3izYJu2lRqY=", "pk": "Wv9GUtt+Z1ndL2sVAqDZcVOiwPJ6hvLpYc7l4w=="},
        {"id": "K300895", "hk": "Mjf5TCYLLNEqF8PwwzcuxH/Ro7eEg3nB6fjZsBquadM=", "pk": "1shMBURjvBMfGGGYlUr+I8nSX6OcGShvXNGcOQ=="},
        {"id": "K301320", "hk": "5Cuhv26tBWw5g9HdnEKEE+I/AOKkEL62K9qnkfrm2pQ=", "pk": "kT+JAjGqR5b8fWXhNJgVIAiLahxagqiOAzn93g=="},
        {"id": "K301315", "hk": "IDfs+1RZoLzVeshhewdPCkMoYA7AGlOX5PTUrDEC6Iw=", "pk": "jy64tttWbVZyz0Fla417pfEFTzf9cpycFHu+lg=="},
        {"id": "K301359", "hk": "nObPxsN+0GYfV3DnmYzvKhLB8adXqmuFH8crHo1ecRw=", "pk": "bnZ1aJPBmWq6+vayzq0+eJHfjPAa/R+iOYMnbw=="},
        {"id": "K301281", "hk": "c3mPIqxlBT5b4k4OqGp132Ne+5ufR0OBCfxPVPF748E=", "pk": "zU7zwYE2S6WBJE/JnsxPrnaQZD0nEysIOA92bA=="},
        {"id": "K301258", "hk": "Pewo7YWMpVB/FYZgyLf9W4x21sq4lWgs7JUnnfStxe4=", "pk": "RHl/59sbIg3XBqZNLuefiJFTCowv48elYsaIbw=="},
        {"id": "K301246", "hk": "H8pzv6kAQte9dHuXQaPb0gTNQmP6LX1xzYGd+0iG93c=", "pk": "j5yNq9IyBRya9gPqmPO28huTm5/YIXt+CZLh+A=="},
        {"id": "K301028", "hk": "+KtcnSPpycC8higfHGZM1GCVdrzRu7FXs8W0Wv9GLvU=", "pk": "0Ua156RGtbGEtF5ffuoP5btstNVtgs3AhI9GoA=="},
        {"id": "K300840", "hk": "WUV+67mccwSbrxNU/ZML+67c8KSLeKrLfjZfkQlM+KA=", "pk": "QG0iwUcS7QJVyYJotNkYWdJavHoRNCi/bSBVWA=="},
        {"id": "K300902", "hk": "IFEauNrRqY6ESSuwKw3xaX7y05a0d50QJXpmRlW/pdQ=", "pk": "yqJgZ+qDzgS8+5TJYNJd97WfHPckwrSyCkkWjA=="},
        {"id": "K300962", "hk": "gWViYvib10J/SPUzKQFNlU4XLosR5h6Bt5c/LIFXgjM=", "pk": "6hEmtntsNNUT/o1MjmfbO7Neg5ji/sjgGXHulQ=="},
        {"id": "K300995", "hk": "Q80b2sLZ856FQiBtwRe1oV2IVpBHNXTwdjHHKm7o9WQ=", "pk": "h0fsIkrDKy4li3HjUqef6yQWzS6BV893fnNNug=="},
        {"id": "K300897", "hk": "XVW5Ufo6jvx4+P2vWRiKRo6z7FgD9qjyFdiB2qgBji4=", "pk": "Uvt8ksF1JrgyTD55qAa7B9A4netRc2BDqgFEZQ=="},
        {"id": "K301058", "hk": "zYKcwITV6ub3YrXlh+ejwz08pFxhzzT8h3Q5H81CXew=", "pk": "2DUeUwD8E4uNBqiko5XioZw5abR1LuRRpJsEzg=="},
        {"id": "K300976", "hk": "CF3CqcwCLUWg+riCQwRuXNLIm4nrM7cXbQiYre0FRIk=", "pk": "hBCvGPpeYfmA27Ehf3eBE45YBZJqt+rbd/jxtQ=="},
        {"id": "K300961", "hk": "1qp02fZN4UFtZxiQRyzTMKKWlUkf3IbI1nhY6qO3Dgw=", "pk": "JkPnoAN00rF5DRuW865AI6R4+XuOwSHgtThTeA=="},
        {"id": "K300838", "hk": "MTMItPpBulJPQt7DVWGh8gtriuc8F0ks3s+dC5DfMFU=", "pk": "Nhw0ta3qh+9pUhZLqFHf9c8SrBDgRIs1oiBx9Q=="},
        {"id": "K300849", "hk": "WguG+HUaCc10Ir+gqpu64Zqcb7hoo9W3rK7YGI1Amrc=", "pk": "afbvUo4PK7ptqAopdf0z28lEY7MmqjcZYXooZg=="},
        {"id": "K300822", "hk": "VwRzSpm4GyPdIxk/oz1ltRHIQohdTbvWHgcBqLnxYFE=", "pk": "qwa/d6qzIpYp1W/KJ4nYVk4ex9KByfiJdryzJw=="},
        {"id": "K301451", "hk": "KjdjcihYJ36rc3caCbIVBznPkCSePXhaDtBk7iwwLxg=", "pk": "865KqQ4dE6MtH0+LumiICVr5CAnuajHMNZn8tg=="},
        {"id": "K301272", "hk": "vLrCzix84HmECuin5xhAN9tSuv8VAILZ/WqCTiwGvVw=", "pk": "MBxDYdlfNuHzXE910uxV/vZ8W9PtX69siYlzIw=="},
        {"id": "K301268", "hk": "mPquDIOQGGAjbcLXTX0D0fHoxwuhcidF3deT8frsQl4=", "pk": "Mhz6ttSDRJkRMyQpU+yCqDEXOMQlxrpQMcHt0g=="},
        {"id": "K301266", "hk": "4GIaJYP7zmF3gKzXijSMMZOycnbRf6+cyf/AU0tqXAQ=", "pk": "6KSJIdtrh2/ocnwOlwt3CDjtlTRIQHnZZL3e3w=="},
        {"id": "K301276", "hk": "vXNV07GddlbZAd9AAZGsBfXmMDx18AbYf44ZyTKGzW0=", "pk": "UoynmDSqM4L4h7vJiG8azDdFuOrgeaxLpJN62g=="},
        {"id": "K301188", "hk": "ApvddZpCHMuGHNGBjW/pmx4hy1ZXGX7lxy5pv3V3Qlk=", "pk": "hwfRMHU6cG13jyOJS+nJbzkUYF7/i2wtEmyNRA=="},
        {"id": "K301166", "hk": "LowLitcnaUjAKHyCjn9SOP9XX2LZWvgE+x84urxNdxc=", "pk": "GU5tXWOD/p0VksVr5ijYsuLG6TnAB7b8LKz/AQ=="},
        {"id": "K301097", "hk": "8VXYQHkWcau/IkiOQVJdKkJ8J7egtHUL5wS4YB3Hd7I=", "pk": "ROvlusUVgWtB9M/WusbV0Xe6dEU6+JyZa7LlLQ=="}
    ]';
    tag RECORD;
    current_attr JSONB;
BEGIN
    FOR tag IN SELECT * FROM jsonb_to_recordset(tags) AS x(id TEXT, hk TEXT, pk TEXT)
    LOOP
        -- Fetch current attributes and ensure it is valid JSON
        SELECT attributes::jsonb INTO current_attr FROM tc_devices WHERE uniqueid = tag.id;
        
        IF FOUND THEN
            -- Update with merged attributes
            UPDATE tc_devices 
            SET attributes = (current_attr || jsonb_build_object('ktag_hashedKey', tag.hk, 'ktag_privateKey', tag.pk))::text
            WHERE uniqueid = tag.id;
        END IF;
    END LOOP;
END
$$;
