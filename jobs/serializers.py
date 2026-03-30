from rest_framework import serializers


class JobSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    company = serializers.DictField(read_only=True)
    location = serializers.DictField(read_only=True)
    description = serializers.CharField(read_only=True)
    salary_min = serializers.FloatField(read_only=True, allow_null=True)
    salary_max = serializers.FloatField(read_only=True, allow_null=True)
    contract_time = serializers.CharField(read_only=True, allow_null=True)
    contract_type = serializers.CharField(read_only=True, allow_null=True)
    redirect_url = serializers.URLField(read_only=True)
    created = serializers.DateTimeField(read_only=True)
    category = serializers.DictField(read_only=True)


class SkillSerializer(serializers.Serializer):
    skill = serializers.CharField(read_only=True)
    count = serializers.IntegerField(read_only=True)


class CountrySerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
